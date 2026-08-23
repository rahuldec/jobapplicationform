// One-off import of the real NBGSM recruitment spreadsheet into the
// platform, so candidate profiles show the actual submitted data instead
// of only the hand-built demo applications from seed.ts.
//
// This does NOT touch the demo scoring pattern or its 6 demo applications
// (created under the original "Assistant Professor — Standard" form) —
// it adds a second, separate ApplicationForm that mirrors the sheet's own
// ~100 columns, plus new departments/jobs (one per subject found in the
// sheet) to hold the ~348 real applications.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import XLSX from "xlsx";

const SHEET_PATH = "/Users/rahulsharma/Downloads/NBGSM - JOB APPLICATION RESPONSES.xlsx";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });
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

async function main() {
  const tenant = await prisma.tenant.findUniqueOrThrow({ where: { slug: "nbgsm" } });

  const wb = XLSX.readFile(SHEET_PATH, { cellDates: true });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true }) as unknown[][];
  const dataRows = rows.slice(1);

  console.log(`Importing ${dataRows.length} applications from the original recruitment sheet...`);

  // Guard against re-running this script twice.
  const existingForm = await prisma.applicationForm.findFirst({
    where: { tenantId: tenant.id, name: "NBGSM — Original Recruitment Application (2026 Intake)" },
  });
  if (existingForm) {
    console.log("Import already run — deleting previous import to re-import cleanly...");
    const jobs = await prisma.job.findMany({ where: { formId: existingForm.id } });
    await prisma.application.deleteMany({ where: { jobId: { in: jobs.map((j) => j.id) } } });
    await prisma.job.deleteMany({ where: { formId: existingForm.id } });
    await prisma.applicationForm.delete({ where: { id: existingForm.id } });
  }

  const form = await prisma.applicationForm.create({
    data: {
      tenantId: tenant.id,
      name: "NBGSM — Original Recruitment Application (2026 Intake)",
      description: "Imported as-is from the original Google Sheet of received applications.",
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

  const fieldByCol = new Map<number, { id: string; fieldKey: string }>();
  SECTIONS.forEach((s, i) => {
    const section = form.sections[i];
    s.fields.forEach((f) => {
      const field = section.fields.find((sf) => sf.fieldKey === f.fieldKey)!;
      fieldByCol.set(f.col, field);
    });
  });

  const subjects = Array.from(new Set(dataRows.map((r) => cell(r, 3)).filter((s): s is string => !!s)));

  const jobBySubject = new Map<string, string>();
  for (const subject of subjects) {
    let department = await prisma.department.findFirst({ where: { tenantId: tenant.id, name: subject } });
    if (!department) {
      department = await prisma.department.create({ data: { tenantId: tenant.id, name: subject } });
    }
    const job = await prisma.job.create({
      data: {
        tenantId: tenant.id,
        departmentId: department.id,
        title: `Assistant Professor — ${subject} (2026 Intake)`,
        code: `NBGSM-${subject.slice(0, 3).toUpperCase()}-2026`,
        employmentType: "Assistant Professor — Regular",
        status: "published",
        publishedAt: new Date(),
        formId: form.id,
      },
    });
    jobBySubject.set(subject, job.id);
  }

  let imported = 0;
  let skipped = 0;
  const auditEntries: {
    tenantId: string;
    actorName: string;
    action: string;
    entityType: string;
    entityId: string;
    createdAt: Date;
  }[] = [];

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i];
    const subject = cell(row, 3);
    const email = cell(row, 16)?.toLowerCase();
    const fullName = cell(row, 6);

    if (!subject || !email || !fullName || !jobBySubject.has(subject)) {
      skipped++;
      continue;
    }

    const addedTimeRaw = row[0];
    const submittedAt = addedTimeRaw instanceof Date ? addedTimeRaw : new Date();
    const ageRaw = row[8];
    const age = typeof ageRaw === "number" ? ageRaw : null;
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

    auditEntries.push({
      tenantId: tenant.id,
      actorName: fullName,
      action: "application.submitted",
      entityType: "Application",
      entityId: application.id,
      createdAt: submittedAt,
    });

    imported++;
    if (imported % 50 === 0) console.log(`  ...${imported} imported`);
  }

  if (auditEntries.length) {
    await withRetry(() => prisma.auditLog.createMany({ data: auditEntries }));
  }

  console.log(`Done. Imported ${imported} applications, skipped ${skipped} (missing subject/email/name).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
