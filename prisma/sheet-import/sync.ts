// Generic Sheet -> platform sync engine. Column layout, sections,
// documents, job derivation, and application numbering are all driven by
// the calling tenant's SheetImportConfig (Tenant.sheetMappingJson) —
// nothing here is specific to any one client's form.
//
// Safe to run on a schedule: matches each Sheet row to a stable
// application number — either its row position, or (when
// coreFields.applicationNumberCol is set) a unique ID the Sheet itself
// already assigns — and upserts, so re-running never duplicates a row and
// never touches workflow state (status, assigned recruiter) that HR has
// already set on an existing application — only its supplementary field
// values/documents get refreshed.
// Deliberately does NOT deduplicate candidates who submitted the same
// job's form more than once; each Sheet row stays its own application.
import { PrismaClient } from "../../src/generated/prisma/client";
import * as XLSX from "xlsx";
import { parseSheetImportConfig, toSheetExportUrl } from "./types";

// The remote connection occasionally hits a transient socket timeout over
// a long-running script. Retry a few times with backoff rather than losing
// the whole import run to one flaky query.
async function withRetry<T>(fn: () => Promise<T>, attempts = 3): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, 1000 * (i + 1)));
    }
  }
  throw lastErr;
}

function cell(row: unknown[], col: number): string | null {
  const v = row[col];
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  return s.length ? s : null;
}

function applyTemplate(template: string, value: string) {
  return template.replace(/\{value3\}/g, value.slice(0, 3).toUpperCase()).replace(/\{value\}/g, value);
}

export async function syncTenantSheet(prisma: PrismaClient, tenantSlug: string) {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: tenantSlug } });
  if (!tenant.sheetSourceUrl || !tenant.sheetMappingJson) {
    throw new Error(`Tenant "${tenantSlug}" has no sheetSourceUrl/sheetMappingJson configured — nothing to sync.`);
  }
  const config = parseSheetImportConfig(tenant.sheetMappingJson);

  const res = await fetch(toSheetExportUrl(tenant.sheetSourceUrl));
  if (!res.ok) throw new Error(`Failed to fetch Sheet export: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { cellDates: true, type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
  const dataRows = rows.slice(1);

  console.log(`[${tenantSlug}] Syncing ${dataRows.length} rows from the live Sheet...`);

  let form = await prisma.applicationForm.findFirst({
    where: { tenantId: tenant.id, name: config.formName },
    include: { sections: { include: { fields: true } } },
  });
  if (!form) {
    form = await prisma.applicationForm.create({
      data: {
        tenantId: tenant.id,
        name: config.formName,
        description: "Synced as-is from the original Google Sheet of received applications.",
      },
      include: { sections: { include: { fields: true } } },
    });
  }

  // Matched by name/fieldKey, not array position: an admin can edit the
  // Sheet mapping (add a section, rename a field's key) any time after
  // the first sync already created this form, so the saved form's
  // sections/fields must be reconciled against the *current* config on
  // every run rather than assumed frozen at creation — missing pieces
  // get added, nothing already there is ever renamed or removed (field
  // values already recorded against it must keep resolving).
  const fieldByCol = new Map<number, { id: string; fieldKey: string }>();
  for (let i = 0; i < config.sections.length; i++) {
    const s = config.sections[i];
    let section = form.sections.find((fs) => fs.name === s.name);
    if (!section) {
      section = await prisma.formSection.create({
        data: { formId: form.id, name: s.name, order: form.sections.length + 1 },
        include: { fields: true },
      });
      form.sections.push(section);
    }
    for (const f of s.fields) {
      let field = section.fields.find((sf) => sf.fieldKey === f.fieldKey);
      if (!field) {
        field = await prisma.formField.create({
          data: { sectionId: section.id, fieldKey: f.fieldKey, label: f.label, fieldType: f.fieldType, order: section.fields.length + 1 },
        });
        section.fields.push(field);
      }
      fieldByCol.set(f.col, field);
    }
  }

  const { jobSelectorCol, emailCol, fullNameCol, mobileCol, dobCol, genderCol, addedTimeCol, applicationNumberCol } =
    config.coreFields;

  // Two ways to derive a stable, already-imported-safe application number:
  //
  // 1. applicationNumberCol set: the Sheet already assigns its own unique
  //    ID per row. Prefix + that ID becomes the application number, and
  //    "already imported" is a plain membership check against every
  //    number already on file for this tenant — robust even if rows get
  //    reordered or inserted, not just appended.
  // 2. Not set (original behavior): the Sheet is append-only (fed by a
  //    form that can't be edited post-submission), so a row's position IS
  //    its stable identity. "Already imported" is just the highest
  //    row-derived number seen so far, parsed back out of existing
  //    application numbers — cheap, and never touches a row already in.
  let newRows: { row: unknown[]; applicationNumber: string }[];
  let alreadyImported: number;

  if (applicationNumberCol !== null && applicationNumberCol !== undefined) {
    const existing = await prisma.application.findMany({
      where: { tenantId: tenant.id },
      select: { applicationNumber: true, candidate: { select: { email: true } } },
    });
    // Maps a number to the email it's already claimed by, so a genuine
    // re-sync of the same row (same email) is still recognized as already
    // imported, while a *different* candidate's row landing on the same
    // Sheet-assigned ID — e.g. after a tenant's Sheet was swapped for a new
    // one that happens to reuse the same numbering scheme — is caught as a
    // real collision instead of silently vanishing (regression: real
    // production bug where 15 genuine applications were dropped this way).
    const claimedBy = new Map(existing.map((a) => [a.applicationNumber, a.candidate.email.toLowerCase()]));
    const usedNumbers = new Set(existing.map((a) => a.applicationNumber));
    alreadyImported = existing.length;

    newRows = [];
    for (const row of dataRows) {
      const rawId = cell(row, applicationNumberCol);
      if (!rawId) continue;
      const email = cell(row, emailCol)?.toLowerCase();
      let applicationNumber = `${config.applicationNumberPrefix}${rawId}`;
      const claimant = claimedBy.get(applicationNumber);
      if (claimant !== undefined) {
        if (claimant === email) continue;
        let suffix = 2;
        while (usedNumbers.has(`${applicationNumber}-${suffix}`)) suffix++;
        applicationNumber = `${applicationNumber}-${suffix}`;
      }
      usedNumbers.add(applicationNumber);
      newRows.push({ row, applicationNumber });
    }
  } else {
    const [{ max_row_index: alreadyImportedRaw }] = await prisma.$queryRawUnsafe<{ max_row_index: number | null }[]>(
      `SELECT MAX(CAST(SUBSTRING("applicationNumber" FROM $1) AS INTEGER)) AS max_row_index
       FROM applications
       WHERE "tenantId" = $2 AND "applicationNumber" LIKE $3`,
      `${config.applicationNumberPrefix}(\\d+)`,
      tenant.id,
      `${config.applicationNumberPrefix}%`,
    );
    alreadyImported = alreadyImportedRaw ?? 0;

    newRows = dataRows.slice(alreadyImported).map((row, n) => ({
      row,
      applicationNumber: `${config.applicationNumberPrefix}${String(alreadyImported + n + 1).padStart(4, "0")}`,
    }));
  }

  if (newRows.length === 0) {
    console.log(`[${tenantSlug}] Nothing new — already imported all ${alreadyImported} rows.`);
    return { created: 0, skipped: 0, alreadyImported };
  }
  console.log(`[${tenantSlug}] ${alreadyImported} rows already imported, ${newRows.length} new row(s) to add.`);

  const selectorValues = Array.from(new Set(newRows.map((r) => cell(r.row, jobSelectorCol)).filter((s): s is string => !!s)));

  const jobBySelector = new Map<string, string>();
  for (const value of selectorValues) {
    let department = await prisma.department.findFirst({ where: { tenantId: tenant.id, name: value } });
    if (!department) {
      department = await prisma.department.create({ data: { tenantId: tenant.id, name: value } });
    }
    const title = applyTemplate(config.jobTitleTemplate, value);
    let job = await prisma.job.findFirst({ where: { tenantId: tenant.id, title } });
    if (!job) {
      job = await prisma.job.create({
        data: {
          tenantId: tenant.id,
          departmentId: department.id,
          title,
          code: config.jobCodeTemplate ? applyTemplate(config.jobCodeTemplate, value) : null,
          employmentType: config.jobEmploymentType,
          status: "published",
          publishedAt: new Date(),
          formId: form.id,
        },
      });
    }
    jobBySelector.set(value, job.id);
  }

  let created = 0;
  let skipped = 0;
  const newAuditEntries: {
    tenantId: string;
    actorName: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
  }[] = [];

  for (const { row, applicationNumber } of newRows) {
    const selectorValue = cell(row, jobSelectorCol);
    const email = cell(row, emailCol)?.toLowerCase();
    const fullName = cell(row, fullNameCol);

    if (!selectorValue || !email || !fullName || !jobBySelector.has(selectorValue)) {
      skipped++;
      continue;
    }

    const addedTimeRaw = row[addedTimeCol];
    const submittedAt = addedTimeRaw instanceof Date ? addedTimeRaw : new Date();
    const dobRaw = dobCol !== null ? row[dobCol] : null;
    const dob = dobRaw instanceof Date ? dobRaw : null;
    const mobile = mobileCol !== null ? cell(row, mobileCol) : null;
    const gender = genderCol !== null ? cell(row, genderCol) : null;

    const candidate = await withRetry(() =>
      prisma.candidate.upsert({
        where: { tenantId_email: { tenantId: tenant.id, email } },
        update: { fullName, mobile, dateOfBirth: dob ?? undefined, gender: gender ?? undefined },
        create: { tenantId: tenant.id, fullName, email, mobile, dateOfBirth: dob, gender },
      }),
    );

    const application = await withRetry(() =>
      prisma.application.create({
        data: {
          tenantId: tenant.id,
          applicationNumber,
          jobId: jobBySelector.get(selectorValue)!,
          candidateId: candidate.id,
          status: "submitted",
          submittedAt,
          createdAt: submittedAt,
        },
      }),
    );

    const fieldValues: { applicationId: string; fieldId: string; valueText: string | null; valueNumber: number | null }[] = [];
    for (const [col, field] of fieldByCol) {
      const raw = row[col];
      if (raw === null || raw === undefined || raw === "") continue;
      const isNumberField = field.fieldKey === "age";
      const isDateField = field.fieldKey === "dob";
      const text = isDateField && raw instanceof Date ? raw.toISOString().slice(0, 10) : String(raw).trim();
      if (!text) continue;
      fieldValues.push({
        applicationId: application.id,
        fieldId: field.id,
        valueText: text,
        valueNumber: isNumberField && typeof raw === "number" ? raw : null,
      });
    }
    if (fieldValues.length) {
      await withRetry(() => prisma.applicationFieldValue.createMany({ data: fieldValues }));
    }

    const docs: { tenantId: string; applicationId: string; documentType: string; externalUrl: string; uploadedAt: Date }[] = [];
    for (const doc of config.documents) {
      const raw = cell(row, doc.col);
      if (!raw) continue;
      docs.push({
        tenantId: tenant.id,
        applicationId: application.id,
        documentType: doc.label,
        externalUrl: raw,
        uploadedAt: submittedAt,
      });
    }
    if (docs.length) {
      await withRetry(() => prisma.document.createMany({ data: docs }));
    }

    created++;
    newAuditEntries.push({
      tenantId: tenant.id,
      actorName: fullName,
      action: "application.submitted",
      entityType: "Application",
      entityId: application.id,
      createdAt: submittedAt,
    });
  }

  if (newAuditEntries.length) {
    await withRetry(() => prisma.auditLog.createMany({ data: newAuditEntries }));
  }

  console.log(`[${tenantSlug}] Done. ${created} new application(s) added, ${skipped} skipped (missing subject/email/name).`);
  return { created, skipped, alreadyImported };
}
