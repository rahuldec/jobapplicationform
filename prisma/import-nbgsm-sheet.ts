// Repeatable sync from the live NBGSM Google Sheet into the platform, so
// candidate profiles reflect whatever the Sheet currently says. Safe to
// run on a schedule: matches each Sheet row to a stable application
// number (its row position) and upserts, so re-running never duplicates
// a row and never touches workflow state (status, assigned recruiter,
// scores) that HR has already set on an existing application — only its
// supplementary field values/documents get refreshed. Deliberately does
// NOT deduplicate candidates who submitted the same job's form more than
// once; each Sheet row stays its own application.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import * as XLSX from "xlsx";

const SHEET_EXPORT_URL =
  "https://docs.google.com/spreadsheets/d/1oLoJA1M6WqgcgkmZ8eg63neRvyhJQpZsMp2unuZfmKk/export?format=xlsx";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

type FieldSpec = {
  col: number;
  fieldKey: string;
  label: string;
  fieldType: "text" | "textarea" | "number" | "date" | "email" | "phone";
};

type DocSpec = { col: number; label: string };

const SECTIONS: { name: string; fields: FieldSpec[] }[] = [
  {
    name: "Personal Details",
    fields: [
      { col: 2, fieldKey: "terms_accepted", label: "Terms and Conditions", fieldType: "text" },
      { col: 3, fieldKey: "subject", label: "Subject Applied For", fieldType: "text" },
      { col: 6, fieldKey: "full_name", label: "Full Name", fieldType: "text" },
      { col: 7, fieldKey: "mothers_name", label: "Mother's Name", fieldType: "text" },
      { col: 8, fieldKey: "age", label: "Age", fieldType: "number" },
      { col: 9, fieldKey: "nationality", label: "Nationality", fieldType: "text" },
      { col: 10, fieldKey: "marital_status", label: "Marital Status", fieldType: "text" },
      { col: 11, fieldKey: "mobile", label: "Contact No.", fieldType: "phone" },
      { col: 12, fieldKey: "fathers_husbands_name", label: "Father's / Husband's Name", fieldType: "text" },
      { col: 13, fieldKey: "dob", label: "Date of Birth", fieldType: "date" },
      { col: 14, fieldKey: "gender", label: "Gender", fieldType: "text" },
      { col: 15, fieldKey: "category", label: "Category", fieldType: "text" },
      { col: 16, fieldKey: "email", label: "Email", fieldType: "email" },
      { col: 17, fieldKey: "present_address", label: "Present Postal Address", fieldType: "textarea" },
      { col: 18, fieldKey: "permanent_same_as_present", label: "Permanent Address same as Present?", fieldType: "text" },
      { col: 19, fieldKey: "permanent_address", label: "Permanent Address", fieldType: "textarea" },
      { col: 20, fieldKey: "physically_handicapped", label: "Physically Handicapped?", fieldType: "text" },
    ],
  },
  {
    name: "Employment & References",
    fields: [
      { col: 22, fieldKey: "current_designation", label: "Current Designation", fieldType: "text" },
      { col: 23, fieldKey: "present_employer", label: "Present Employer", fieldType: "text" },
      { col: 24, fieldKey: "current_pay_scale", label: "Current Pay Scale", fieldType: "text" },
      { col: 25, fieldKey: "current_pay_grade", label: "Current Pay Grade", fieldType: "text" },
      { col: 26, fieldKey: "current_pay_scale_grade_pay", label: "Current Pay Scale & Grade Pay", fieldType: "text" },
      { col: 27, fieldKey: "approved_by_university", label: "Approved by which University?", fieldType: "text" },
      { col: 29, fieldKey: "reference_1", label: "Reference 1", fieldType: "textarea" },
      { col: 30, fieldKey: "reference_2", label: "Reference 2", fieldType: "textarea" },
    ],
  },
  {
    name: "Educational Qualifications",
    fields: [
      { col: 31, fieldKey: "matric_qualification", label: "Matriculation", fieldType: "textarea" },
      { col: 32, fieldKey: "plus_two_qualification", label: "10+2", fieldType: "textarea" },
      { col: 33, fieldKey: "graduation_qualification", label: "Graduation", fieldType: "textarea" },
      { col: 34, fieldKey: "post_graduation_qualification", label: "Post-Graduation", fieldType: "textarea" },
      { col: 35, fieldKey: "mphil_qualification", label: "M.Phil", fieldType: "textarea" },
      { col: 36, fieldKey: "phd_qualification", label: "Ph.D.", fieldType: "textarea" },
      { col: 37, fieldKey: "net_qualification", label: "NET", fieldType: "textarea" },
      { col: 38, fieldKey: "net_jrf_qualification", label: "NET (JRF)", fieldType: "textarea" },
      { col: 39, fieldKey: "slet_set_qualification", label: "SLET/SET", fieldType: "textarea" },
      { col: 40, fieldKey: "other_qualification", label: "Any Other Qualification", fieldType: "textarea" },
    ],
  },
  {
    name: "Teaching Experience",
    fields: [
      { col: 51, fieldKey: "has_teaching_experience", label: "Has Teaching Experience?", fieldType: "text" },
      { col: 52, fieldKey: "teaching_experience_entry_1", label: "Teaching Experience — Entry 1", fieldType: "textarea" },
      { col: 53, fieldKey: "teaching_experience_entry_2", label: "Teaching Experience — Entry 2", fieldType: "textarea" },
      { col: 54, fieldKey: "teaching_experience_entry_3", label: "Teaching Experience — Entry 3", fieldType: "textarea" },
      { col: 55, fieldKey: "teaching_experience_entry_4", label: "Teaching Experience — Entry 4", fieldType: "textarea" },
    ],
  },
  {
    name: "Research & Co-Curricular",
    fields: [
      { col: 57, fieldKey: "has_research_experience", label: "Has Research Experience?", fieldType: "text" },
      { col: 58, fieldKey: "research_books", label: "Books", fieldType: "textarea" },
      { col: 59, fieldKey: "research_papers", label: "Research Papers", fieldType: "textarea" },
      { col: 60, fieldKey: "paper_presentations", label: "Paper Presentation in Conferences", fieldType: "textarea" },
      { col: 62, fieldKey: "ncc_certificate_mention", label: "NCC 'C'/'B' Certificate", fieldType: "text" },
      { col: 63, fieldKey: "nss_award_mention", label: "NSS National/State Award", fieldType: "text" },
      { col: 64, fieldKey: "competition_position_mention", label: "Position in Competitions", fieldType: "text" },
      { col: 65, fieldKey: "republic_day_parade_mention", label: "Republic Day Parade Participation", fieldType: "text" },
      { col: 67, fieldKey: "sports_international_position", label: "Sports — International Level Position", fieldType: "text" },
      { col: 68, fieldKey: "sports_national_position", label: "Sports — National Level Position", fieldType: "text" },
      { col: 69, fieldKey: "sports_interuniversity_position", label: "Sports — Inter-University Level Position", fieldType: "text" },
    ],
  },
  {
    name: "Declarations & Other",
    fields: [
      { col: 71, fieldKey: "joining_period_required", label: "Period Required for Joining", fieldType: "text" },
      { col: 73, fieldKey: "convicted_or_debarred", label: "Convicted / Detained / Debarred?", fieldType: "textarea" },
      { col: 75, fieldKey: "removed_or_disciplinary_action", label: "Removed / Disciplinary Action?", fieldType: "textarea" },
      { col: 77, fieldKey: "additional_information", label: "Additional Information", fieldType: "textarea" },
    ],
  },
];

const DOCS: DocSpec[] = [
  { col: 4, label: "Photograph" },
  { col: 5, label: "Signature" },
  { col: 21, label: "Physically Handicapped — Supporting Document" },
  { col: 28, label: "University Approval — Supporting Document" },
  { col: 41, label: "Matriculation — Certificate" },
  { col: 42, label: "10+2 — Certificate" },
  { col: 43, label: "Graduation — Certificate" },
  { col: 44, label: "Post-Graduation — Certificate" },
  { col: 45, label: "M.Phil / Ph.D. / NET / JRF / SLET — Combined Certificate" },
  { col: 46, label: "Ph.D. — Certificate" },
  { col: 47, label: "NET — Certificate" },
  { col: 48, label: "NET (JRF) — Certificate" },
  { col: 49, label: "SLET/SET — Certificate" },
  { col: 50, label: "Other Qualification — Certificate" },
  { col: 56, label: "Teaching Experience — Supporting Document" },
  { col: 61, label: "Research Publications — Supporting Document" },
  { col: 66, label: "NSS Award — Supporting Document" },
  { col: 70, label: "Sports — Supporting Document" },
  { col: 72, label: "Fee Payment — Supporting Document" },
  { col: 74, label: "Convictions/Debarment — Supporting Document" },
  { col: 76, label: "Disciplinary Action — Supporting Document" },
  { col: 78, label: "Additional Information — Supporting Document" },
  { col: 103, label: "Score Sheet" },
];

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

export async function syncNbgsmSheet() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: "nbgsm" } });

  const res = await fetch(SHEET_EXPORT_URL);
  if (!res.ok) throw new Error(`Failed to fetch Sheet export: HTTP ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const wb = XLSX.read(buf, { cellDates: true, type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
  const dataRows = rows.slice(1);

  console.log(`Syncing ${dataRows.length} rows from the live NBGSM Sheet...`);

  const formName = "NBGSM — Original Recruitment Application (2026 Intake)";
  let form = await prisma.applicationForm.findFirst({
    where: { tenantId: tenant.id, name: formName },
    include: { sections: { include: { fields: true } } },
  });
  if (!form) {
    form = await prisma.applicationForm.create({
      data: {
        tenantId: tenant.id,
        name: formName,
        description: "Synced as-is from the original Google Sheet of received applications.",
        sections: {
          create: SECTIONS.map((s, i) => ({
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
  SECTIONS.forEach((s, i) => {
    const section = form!.sections[i];
    s.fields.forEach((f) => {
      const field = section.fields.find((sf) => sf.fieldKey === f.fieldKey)!;
      fieldByCol.set(f.col, field);
    });
  });

  // The Sheet is fed by a Zoho form: once a candidate submits, they can't
  // go back and edit it. So the Sheet is append-only — existing rows never
  // change, only new ones get added at the end. That means a sync never
  // needs to touch a row it has already imported; it only needs to find
  // where it left off and import whatever's new since then. This keeps
  // every sync fast (a no-op most days) and never risks overwriting a
  // status/assignment HR has already set on an existing application.
  const [{ max_row_index: alreadyImportedRaw }] = await prisma.$queryRawUnsafe<{ max_row_index: number | null }[]>(
    `SELECT MAX(CAST(SUBSTRING("applicationNumber" FROM $1) AS INTEGER)) AS max_row_index
     FROM applications
     WHERE "tenantId" = $2 AND "applicationNumber" LIKE $3`,
    "NBGSM-2026-IMP-(\\d+)",
    tenant.id,
    "NBGSM-2026-IMP-%",
  );
  const alreadyImported = alreadyImportedRaw ?? 0;

  if (dataRows.length <= alreadyImported) {
    console.log(`Nothing new — already imported all ${alreadyImported} rows.`);
    return { created: 0, skipped: 0, alreadyImported };
  }

  const newRows = dataRows.slice(alreadyImported);
  console.log(`${alreadyImported} rows already imported, ${newRows.length} new row(s) to add.`);

  const subjects = Array.from(new Set(newRows.map((r) => cell(r, 3)).filter((s): s is string => !!s)));

  const jobBySubject = new Map<string, string>();
  for (const subject of subjects) {
    let department = await prisma.department.findFirst({ where: { tenantId: tenant.id, name: subject } });
    if (!department) {
      department = await prisma.department.create({ data: { tenantId: tenant.id, name: subject } });
    }
    const title = `Assistant Professor — ${subject} (2026 Intake)`;
    let job = await prisma.job.findFirst({ where: { tenantId: tenant.id, title } });
    if (!job) {
      job = await prisma.job.create({
        data: {
          tenantId: tenant.id,
          departmentId: department.id,
          title,
          code: `NBGSM-${subject.slice(0, 3).toUpperCase()}-2026`,
          employmentType: "Assistant Professor — Regular",
          status: "published",
          publishedAt: new Date(),
          formId: form.id,
        },
      });
    }
    jobBySubject.set(subject, job.id);
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
    const subject = cell(row, 3);
    const email = cell(row, 16)?.toLowerCase();
    const fullName = cell(row, 6);

    if (!subject || !email || !fullName || !jobBySubject.has(subject)) {
      skipped++;
      continue;
    }

    const addedTimeRaw = row[0];
    const submittedAt = addedTimeRaw instanceof Date ? addedTimeRaw : new Date();
    const dobRaw = row[13];
    const dob = dobRaw instanceof Date ? dobRaw : null;
    const mobile = cell(row, 11);
    const gender = cell(row, 14);

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
    const applicationNumber = `NBGSM-2026-IMP-${String(i + 1).padStart(4, "0")}`;

    const application = await withRetry(() =>
      prisma.application.create({
        data: {
          tenantId: tenant.id,
          applicationNumber,
          jobId: jobBySubject.get(subject)!,
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
    for (const doc of DOCS) {
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

  console.log(`Done. ${created} new application(s) added, ${skipped} skipped (missing subject/email/name).`);
  return { created, skipped, alreadyImported };
}

if (require.main === module) {
  syncNbgsmSheet()
    .catch((err) => {
      console.error(err);
      process.exit(1);
    })
    .finally(async () => {
      await prisma.$disconnect();
    });
}
