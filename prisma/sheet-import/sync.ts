// Generic Sheet -> platform sync engine. Column layout, sections,
// documents, job derivation, and application numbering are all driven by
// the calling tenant's SheetImportConfig (Tenant.sheetMappingJson) —
// nothing here is specific to any one client's form.
//
// Safe to run on a schedule: matches each Sheet row to a stable
// application number (its row position) and upserts, so re-running never
// duplicates a row and never touches workflow state (status, assigned
// recruiter, scores) that HR has already set on an existing application —
// only its supplementary field values/documents get refreshed.
// Deliberately does NOT deduplicate candidates who submitted the same
// job's form more than once; each Sheet row stays its own application.
import { PrismaClient } from "../../src/generated/prisma/client";
import * as XLSX from "xlsx";
import { parseSheetImportConfig, type SheetImportConfig } from "./types";

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

  const res = await fetch(tenant.sheetSourceUrl);
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
        sections: {
          create: config.sections.map((s, i) => ({
            name: s.name,
            order: i + 1,
            fields: {
              create: s.fields.map((f, j) => ({
                fieldKey: f.fieldKey,
                label: f.label,
                fieldType: f.fieldType,
                order: j + 1,
              })),
            },
          })),
        },
      },
      include: { sections: { include: { fields: true } } },
    });
  }

  const fieldByCol = new Map<number, { id: string; fieldKey: string }>();
  config.sections.forEach((s, i) => {
    const section = form!.sections[i];
    s.fields.forEach((f) => {
      const field = section.fields.find((sf) => sf.fieldKey === f.fieldKey)!;
      fieldByCol.set(f.col, field);
    });
  });

  // The Sheet is append-only for every client we support so far (fed by a
  // form that can't be edited post-submission) — existing rows never
  // change, only new ones get added at the end. That means a sync never
  // needs to touch a row it has already imported; it only needs to find
  // where it left off. This keeps every sync fast (a no-op most days) and
  // never risks overwriting a status/assignment HR has already set.
  const [{ max_row_index: alreadyImportedRaw }] = await prisma.$queryRawUnsafe<{ max_row_index: number | null }[]>(
    `SELECT MAX(CAST(SUBSTRING("applicationNumber" FROM $1) AS INTEGER)) AS max_row_index
     FROM applications
     WHERE "tenantId" = $2 AND "applicationNumber" LIKE $3`,
    `${config.applicationNumberPrefix}(\\d+)`,
    tenant.id,
    `${config.applicationNumberPrefix}%`,
  );
  const alreadyImported = alreadyImportedRaw ?? 0;

  if (dataRows.length <= alreadyImported) {
    console.log(`[${tenantSlug}] Nothing new — already imported all ${alreadyImported} rows.`);
    return { created: 0, skipped: 0, alreadyImported };
  }

  const newRows = dataRows.slice(alreadyImported);
  console.log(`[${tenantSlug}] ${alreadyImported} rows already imported, ${newRows.length} new row(s) to add.`);

  const { jobSelectorCol, emailCol, fullNameCol, mobileCol, dobCol, genderCol, addedTimeCol } = config.coreFields;

  const selectorValues = Array.from(new Set(newRows.map((r) => cell(r, jobSelectorCol)).filter((s): s is string => !!s)));

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
          code: applyTemplate(config.jobCodeTemplate, value),
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

  for (let n = 0; n < newRows.length; n++) {
    const row = newRows[n];
    const i = alreadyImported + n; // absolute row index, for applicationNumber
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

    // Stable per-row identity: row position in this append-only Sheet.
    // Each row — including a candidate resubmitting the same job — gets
    // its own distinct application.
    const applicationNumber = `${config.applicationNumberPrefix}${String(i + 1).padStart(4, "0")}`;

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
