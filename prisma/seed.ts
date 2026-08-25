// Demo data for local development.
//
// Creates TWO tenants:
//   - NBGSM: a fully configured tenant (form, jobs, candidates, applications).
//   - Greenview: a freshly onboarded tenant with a department and a draft
//     job but no form or applications yet.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

async function main() {
  console.log("Clearing existing data...");
  await prisma.auditLog.deleteMany();
  await prisma.document.deleteMany();
  await prisma.applicationFieldValue.deleteMany();
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.job.deleteMany();
  await prisma.formField.deleteMany();
  await prisma.formSection.deleteMany();
  await prisma.applicationForm.deleteMany();
  await prisma.department.deleteMany();
  await prisma.user.deleteMany();
  await prisma.tenant.deleteMany();

  // ---------------------------------------------------------------------
  // Tenant 1: NBGSM — fully configured
  // ---------------------------------------------------------------------
  const nbgsm = await prisma.tenant.create({
    data: {
      name: "Nirankari Baba Gurbachan Singh Memorial College",
      slug: "nbgsm",
      brandingJson: JSON.stringify({ primaryColor: "#7C2D12", shortName: "NBGSM" }),
    },
  });

  const [commerceDept, hindiDept, englishDept] = await Promise.all([
    prisma.department.create({ data: { tenantId: nbgsm.id, name: "Commerce", code: "COM" } }),
    prisma.department.create({ data: { tenantId: nbgsm.id, name: "Hindi", code: "HIN" } }),
    prisma.department.create({ data: { tenantId: nbgsm.id, name: "English", code: "ENG" } }),
  ]);

  const nbgsmAdmin = await prisma.user.create({
    data: { tenantId: nbgsm.id, name: "Renu Sharma", email: "admin@nbgsm.ac.in", role: "college_admin" },
  });
  const nbgsmRecruiter = await prisma.user.create({
    data: { tenantId: nbgsm.id, name: "Vikram Rao", email: "recruiter@nbgsm.ac.in", role: "recruiter" },
  });

  // --- Application form ---------------------------------------------------
  const form = await prisma.applicationForm.create({
    data: {
      tenantId: nbgsm.id,
      name: "Assistant Professor Application — Standard",
      description: "Standard faculty recruitment application form.",
      sections: {
        create: [
          {
            name: "Personal Details",
            order: 1,
            fields: {
              create: [
                { fieldKey: "full_name", label: "Full Name", fieldType: "text", required: true, order: 1 },
                { fieldKey: "fathers_husbands_name", label: "Father's / Husband's Name", fieldType: "text", order: 2 },
                { fieldKey: "dob", label: "Date of Birth", fieldType: "date", order: 3 },
                {
                  fieldKey: "gender",
                  label: "Gender",
                  fieldType: "select",
                  order: 4,
                  optionsJson: JSON.stringify([
                    { value: "Female", label: "Female" },
                    { value: "Male", label: "Male" },
                    { value: "Other", label: "Other" },
                  ]),
                },
                {
                  fieldKey: "category",
                  label: "Category",
                  fieldType: "select",
                  order: 5,
                  optionsJson: JSON.stringify([
                    { value: "General", label: "General" },
                    { value: "OBC", label: "OBC" },
                    { value: "SC", label: "SC" },
                    { value: "ST", label: "ST" },
                  ]),
                },
                { fieldKey: "email", label: "Email", fieldType: "email", required: true, order: 6 },
                { fieldKey: "mobile", label: "Contact No.", fieldType: "phone", required: true, order: 7 },
                { fieldKey: "present_address", label: "Present Postal Address", fieldType: "textarea", order: 8 },
              ],
            },
          },
          {
            name: "Academic Qualifications",
            order: 2,
            fields: {
              create: [
                { fieldKey: "matric_percentage", label: "Matriculation — Marks %", fieldType: "number", order: 1 },
                { fieldKey: "plus_two_percentage", label: "10+2 — Marks %", fieldType: "number", order: 2 },
                { fieldKey: "graduation_percentage", label: "Graduation — Marks %", fieldType: "number", order: 3 },
                { fieldKey: "post_graduation_percentage", label: "Post-Graduation — Marks %", fieldType: "number", order: 4 },
                { fieldKey: "phd_status", label: "Ph.D. Awarded?", fieldType: "yes_no", order: 5 },
                { fieldKey: "net_status", label: "NET Qualified?", fieldType: "yes_no", order: 6 },
                { fieldKey: "slet_status", label: "SLET / SET Qualified?", fieldType: "yes_no", order: 7 },
              ],
            },
          },
          {
            name: "Teaching Experience & Research",
            order: 3,
            fields: {
              create: [
                { fieldKey: "teaching_experience_years", label: "Teaching Experience (Years)", fieldType: "number", order: 1 },
                { fieldKey: "research_publications_count", label: "No. of Research Publications", fieldType: "number", order: 2 },
                { fieldKey: "paper_presentations_count", label: "No. of Paper Presentations", fieldType: "number", order: 3 },
              ],
            },
          },
          {
            name: "Co-Curricular & Sports",
            order: 4,
            fields: {
              create: [
                { fieldKey: "ncc_certificate", label: "NCC 'C' or 'B' Certificate?", fieldType: "yes_no", order: 1 },
                { fieldKey: "nss_award", label: "NSS National/State Award?", fieldType: "yes_no", order: 2 },
                {
                  fieldKey: "competition_position",
                  label: "Highest Position in Competitions (Debate/Quiz/Fine Art etc.)",
                  fieldType: "select",
                  order: 3,
                  optionsJson: JSON.stringify([
                    { value: "None", label: "None" },
                    { value: "State", label: "State Level" },
                    { value: "National", label: "National Level" },
                    { value: "International", label: "International Level" },
                  ]),
                },
                {
                  fieldKey: "sports_position",
                  label: "Highest Sports Position",
                  fieldType: "select",
                  order: 4,
                  optionsJson: JSON.stringify([
                    { value: "None", label: "None" },
                    { value: "Inter-University", label: "Inter-University" },
                    { value: "National", label: "National" },
                    { value: "International", label: "International" },
                  ]),
                },
              ],
            },
          },
        ],
      },
    },
    include: { sections: { include: { fields: true } } },
  });

  const fieldByKey = new Map(
    form.sections.flatMap((s) => s.fields).map((f) => [f.fieldKey, f]),
  );

  // --- Jobs -----------------------------------------------------------------
  const jobCommerce = await prisma.job.create({
    data: {
      tenantId: nbgsm.id,
      departmentId: commerceDept.id,
      title: "Assistant Professor — Commerce",
      code: "NBGSM-COM-01",
      description: "Regular Assistant Professor position in the Department of Commerce.",
      employmentType: "Assistant Professor — Regular",
      numberOfPositions: 1,
      status: "published",
      applicationDeadline: daysAgo(-10),
      formId: form.id,
      publishedAt: daysAgo(25),
    },
  });

  const jobHindi = await prisma.job.create({
    data: {
      tenantId: nbgsm.id,
      departmentId: hindiDept.id,
      title: "Assistant Professor — Hindi",
      code: "NBGSM-HIN-01",
      description: "Regular Assistant Professor position in the Department of Hindi.",
      employmentType: "Assistant Professor — Regular",
      numberOfPositions: 1,
      status: "published",
      applicationDeadline: daysAgo(-5),
      formId: form.id,
      publishedAt: daysAgo(18),
    },
  });

  const jobEnglish = await prisma.job.create({
    data: {
      tenantId: nbgsm.id,
      departmentId: englishDept.id,
      title: "Assistant Professor — English",
      code: "NBGSM-ENG-01",
      description: "Guest faculty position in the Department of English.",
      employmentType: "Guest Faculty",
      numberOfPositions: 2,
      status: "draft",
      formId: form.id,
    },
  });

  // --- Candidates & Applications ---------------------------------------------
  type Answers = Record<string, string | number | boolean>;

  async function createApplication(opts: {
    jobId: string;
    applicationNumber: string;
    candidateName: string;
    email: string;
    mobile: string;
    status: string;
    createdAt: Date;
    submittedAt?: Date;
    recruiterId?: string;
    answers: Answers;
    documents: Array<{ documentType: string; externalUrl: string; verified?: boolean }>;
  }) {
    const candidate = await prisma.candidate.create({
      data: {
        tenantId: nbgsm.id,
        fullName: opts.candidateName,
        email: opts.email,
        mobile: opts.mobile,
      },
    });

    const application = await prisma.application.create({
      data: {
        tenantId: nbgsm.id,
        applicationNumber: opts.applicationNumber,
        jobId: opts.jobId,
        candidateId: candidate.id,
        status: opts.status,
        assignedRecruiterId: opts.recruiterId,
        createdAt: opts.createdAt,
        submittedAt: opts.submittedAt,
      },
    });

    for (const [key, value] of Object.entries(opts.answers)) {
      const field = fieldByKey.get(key);
      if (!field) continue;
      const isNumber = typeof value === "number";
      const isBool = typeof value === "boolean";
      await prisma.applicationFieldValue.create({
        data: {
          applicationId: application.id,
          fieldId: field.id,
          valueText: isBool ? (value ? "Yes" : "No") : String(value),
          valueNumber: isNumber ? value : null,
        },
      });
    }

    for (const doc of opts.documents) {
      await prisma.document.create({
        data: {
          tenantId: nbgsm.id,
          applicationId: application.id,
          documentType: doc.documentType,
          externalUrl: doc.externalUrl,
          verified: doc.verified ?? false,
          uploadedAt: opts.createdAt,
        },
      });
    }

    await prisma.auditLog.create({
      data: {
        tenantId: nbgsm.id,
        actorName: opts.candidateName,
        action: "application.submitted",
        entityType: "Application",
        entityId: application.id,
        createdAt: opts.submittedAt ?? opts.createdAt,
      },
    });

    return application;
  }

  await createApplication({
    jobId: jobCommerce.id,
    applicationNumber: "NBGSM-2026-0001",
    candidateName: "Sakshi Aggarwal",
    email: "aggarwalsakshi2401@gmail.com",
    mobile: "9467344811",
    status: "shortlisted",
    createdAt: daysAgo(12),
    submittedAt: daysAgo(12),
    recruiterId: nbgsmRecruiter.id,
    answers: {
      full_name: "Sakshi Aggarwal",
      fathers_husbands_name: "Rahul Goyal",
      gender: "Female",
      category: "General",
      email: "aggarwalsakshi2401@gmail.com",
      mobile: "9467344811",
      matric_percentage: 65,
      plus_two_percentage: 88,
      graduation_percentage: 76,
      post_graduation_percentage: 70,
      phd_status: false,
      net_status: true,
      slet_status: false,
      teaching_experience_years: 1,
      research_publications_count: 2,
      paper_presentations_count: 1,
      ncc_certificate: false,
      nss_award: false,
      competition_position: "None",
      sports_position: "None",
    },
    documents: [
      { documentType: "Photograph", externalUrl: "https://drive.google.com/file/d/1VLDqeRA20krFy-Z3HZRfiMW1k4C4VLbg/view", verified: true },
      { documentType: "Signature", externalUrl: "https://drive.google.com/file/d/1M33Ccb07Py-QIBKlCo215g_k6P6-8C2N/view", verified: true },
      { documentType: "Post-Graduation Marksheet", externalUrl: "https://drive.google.com/file/d/1a7EBhiAOt9_fbdchNvf7JeZEGqFtk4kH/view" },
    ],
  });

  await createApplication({
    jobId: jobCommerce.id,
    applicationNumber: "NBGSM-2026-0002",
    candidateName: "Priya Nair",
    email: "priya.nair.demo@example.com",
    mobile: "9820011223",
    status: "under_review",
    createdAt: daysAgo(6),
    submittedAt: daysAgo(6),
    recruiterId: nbgsmRecruiter.id,
    answers: {
      full_name: "Priya Nair",
      gender: "Female",
      category: "OBC",
      email: "priya.nair.demo@example.com",
      mobile: "9820011223",
      matric_percentage: 72,
      plus_two_percentage: 80,
      graduation_percentage: 68,
      post_graduation_percentage: 62,
      phd_status: false,
      net_status: false,
      slet_status: true,
      teaching_experience_years: 4,
      research_publications_count: 5,
      paper_presentations_count: 3,
      ncc_certificate: true,
      nss_award: false,
      competition_position: "State",
      sports_position: "None",
    },
    documents: [
      { documentType: "Photograph", externalUrl: "https://drive.google.com/file/d/example-priya-photo/view" },
    ],
  });

  await createApplication({
    jobId: jobHindi.id,
    applicationNumber: "NBGSM-2026-0003",
    candidateName: "Savita Rani",
    email: "savita8005@gmail.com",
    mobile: "9871930377",
    status: "selected",
    createdAt: daysAgo(30),
    submittedAt: daysAgo(30),
    recruiterId: nbgsmRecruiter.id,
    answers: {
      full_name: "Savita Rani",
      fathers_husbands_name: "Kiran Pal",
      gender: "Female",
      category: "SC",
      email: "savita8005@gmail.com",
      mobile: "9871930377",
      matric_percentage: 52,
      plus_two_percentage: 65,
      graduation_percentage: 44,
      post_graduation_percentage: 54,
      phd_status: false,
      net_status: false,
      slet_status: false,
      teaching_experience_years: 2,
      research_publications_count: 0,
      paper_presentations_count: 0,
      ncc_certificate: false,
      nss_award: false,
      competition_position: "None",
      sports_position: "None",
    },
    documents: [
      { documentType: "Photograph", externalUrl: "https://drive.google.com/file/d/example-savita-photo/view", verified: true },
      { documentType: "Matriculation Certificate", externalUrl: "https://drive.google.com/file/d/example-savita-matric/view", verified: true },
    ],
  });

  await createApplication({
    jobId: jobHindi.id,
    applicationNumber: "NBGSM-2026-0004",
    candidateName: "Anjali Verma",
    email: "anjali.verma.demo@example.com",
    mobile: "9911223344",
    status: "rejected",
    createdAt: daysAgo(28),
    submittedAt: daysAgo(28),
    recruiterId: nbgsmRecruiter.id,
    answers: {
      full_name: "Anjali Verma",
      gender: "Female",
      category: "General",
      email: "anjali.verma.demo@example.com",
      mobile: "9911223344",
      matric_percentage: 58,
      plus_two_percentage: 60,
      graduation_percentage: 50,
      post_graduation_percentage: 48,
      phd_status: false,
      net_status: false,
      slet_status: false,
      teaching_experience_years: 0,
      research_publications_count: 0,
      paper_presentations_count: 0,
      ncc_certificate: false,
      nss_award: false,
      competition_position: "None",
      sports_position: "None",
    },
    documents: [],
  });

  await createApplication({
    jobId: jobCommerce.id,
    applicationNumber: "NBGSM-2026-0005",
    candidateName: "Meera Iyer",
    email: "meera.iyer.demo@example.com",
    mobile: "9845098450",
    status: "submitted",
    createdAt: daysAgo(1),
    submittedAt: daysAgo(1),
    answers: {
      full_name: "Meera Iyer",
      gender: "Female",
      category: "General",
      email: "meera.iyer.demo@example.com",
      mobile: "9845098450",
      matric_percentage: 81,
      plus_two_percentage: 84,
      graduation_percentage: 79,
      post_graduation_percentage: 74,
      phd_status: true,
      net_status: true,
      slet_status: true,
      teaching_experience_years: 6,
      research_publications_count: 8,
      paper_presentations_count: 4,
      ncc_certificate: false,
      nss_award: true,
      competition_position: "National",
      sports_position: "None",
    },
    documents: [
      { documentType: "Photograph", externalUrl: "https://drive.google.com/file/d/example-meera-photo/view" },
      { documentType: "Ph.D. Certificate", externalUrl: "https://drive.google.com/file/d/example-meera-phd/view" },
    ],
  });

  await createApplication({
    jobId: jobCommerce.id,
    applicationNumber: "NBGSM-2026-0006",
    candidateName: "Farah Sheikh",
    email: "farah.sheikh.demo@example.com",
    mobile: "9090909090",
    status: "draft",
    createdAt: daysAgo(0),
    answers: {
      full_name: "Farah Sheikh",
      email: "farah.sheikh.demo@example.com",
      mobile: "9090909090",
    },
    documents: [],
  });

  // ---------------------------------------------------------------------
  // Tenant 2: Greenview Institute of Technology — blank slate on purpose
  // ---------------------------------------------------------------------
  const greenview = await prisma.tenant.create({
    data: {
      name: "Greenview Institute of Technology",
      slug: "greenview",
      brandingJson: JSON.stringify({ primaryColor: "#065F46", shortName: "Greenview" }),
    },
  });

  const csDept = await prisma.department.create({
    data: { tenantId: greenview.id, name: "Computer Science", code: "CS" },
  });

  await prisma.user.create({
    data: { tenantId: greenview.id, name: "Arjun Mehta", email: "admin@greenview.edu", role: "college_admin" },
  });

  await prisma.job.create({
    data: {
      tenantId: greenview.id,
      departmentId: csDept.id,
      title: "Assistant Professor — Computer Science",
      code: "GVIT-CS-01",
      description: "Newly opened position. Application form is not configured yet.",
      status: "draft",
      numberOfPositions: 1,
    },
  });

  // Deliberately no ApplicationForm, no applications for Greenview — this is
  // what a brand-new tenant looks like before its admin configures anything.

  console.log("Seed complete.");
  console.log(`  Tenant "nbgsm": ${nbgsm.id}`);
  console.log(`  Tenant "greenview": ${greenview.id}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
