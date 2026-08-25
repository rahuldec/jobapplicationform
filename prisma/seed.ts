// Demo data for local development.
//
// Per the product's scoring principle, the platform itself must start with
// zero predefined scoring methodology. This seed demonstrates that by
// creating TWO tenants:
//   - NBGSM: a fully configured tenant (form + a UGC-style example scoring
//     pattern the admin built, jobs, candidates, applications, scores).
//   - Greenview: a freshly onboarded tenant with a department and a draft
//     job but NO scoring pattern at all — proving the platform doesn't
//     ship with a default methodology.
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { calculateScore } from "../src/lib/scoring/engine";
import type { CriterionInput } from "../src/lib/scoring/engine";
import type { ApplicationValueMap } from "../src/lib/scoring/types";

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
  await prisma.applicationScore.deleteMany();
  await prisma.document.deleteMany();
  await prisma.applicationFieldValue.deleteMany();
  await prisma.application.deleteMany();
  await prisma.candidate.deleteMany();
  await prisma.scoringCriterion.deleteMany();
  await prisma.scoringPatternVersion.deleteMany();
  await prisma.scoringPattern.deleteMany();
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

  // --- Scoring pattern (an EXAMPLE the admin built — not a system default) ---
  const pattern = await prisma.scoringPattern.create({
    data: {
      tenantId: nbgsm.id,
      name: "UGC-style Academic Performance Indicator (Example)",
      description:
        "Example scoring pattern built by the college admin, modeled on UGC API guidelines. Not a platform default — every criterion below was configured through the Scoring Pattern Builder.",
    },
  });

  const criteriaDefs: Array<{
    name: string;
    description: string;
    maxPoints: number;
    order: number;
    method: string;
    sourceFieldKey: string | null;
    config: Record<string, unknown>;
  }> = [
    {
      name: "Academic Record — Post-Graduation",
      description: "Points scaled to Post-Graduation marks percentage.",
      maxPoints: 40,
      order: 1,
      method: "numeric_range",
      sourceFieldKey: "post_graduation_percentage",
      config: {
        method: "numeric_range",
        ranges: [
          { min: 0, max: 54.99, points: 0, label: "Below 55%" },
          { min: 55, max: 59.99, points: 20, label: "55–59.99%" },
          { min: 60, max: 69.99, points: 30, label: "60–69.99%" },
          { min: 70, max: 100, points: 40, label: "70% and above" },
        ],
      },
    },
    {
      name: "Ph.D.",
      description: "Full points if the candidate holds a Ph.D.",
      maxPoints: 10,
      order: 2,
      method: "yes_no",
      sourceFieldKey: "phd_status",
      config: { method: "yes_no", yesPoints: 10, noPoints: 0 },
    },
    {
      name: "NET Qualification",
      description: "Full points if the candidate has qualified NET.",
      maxPoints: 10,
      order: 3,
      method: "yes_no",
      sourceFieldKey: "net_status",
      config: { method: "yes_no", yesPoints: 10, noPoints: 0 },
    },
    {
      name: "Teaching Experience",
      description: "2 points per year of teaching experience, capped at 20.",
      maxPoints: 20,
      order: 4,
      method: "count",
      sourceFieldKey: "teaching_experience_years",
      config: { method: "count", pointsPerUnit: 2, cap: 20 },
    },
    {
      name: "Research Publications",
      description: "1 point per publication, capped at 10.",
      maxPoints: 10,
      order: 5,
      method: "count",
      sourceFieldKey: "research_publications_count",
      config: { method: "count", pointsPerUnit: 1, cap: 10 },
    },
    {
      name: "Co-Curricular Achievement",
      description: "Points by highest competition level reached.",
      maxPoints: 5,
      order: 6,
      method: "dropdown",
      sourceFieldKey: "competition_position",
      config: {
        method: "dropdown",
        pointsMap: { None: 0, State: 2, National: 3, International: 5 },
        defaultPoints: 0,
      },
    },
    {
      name: "Sports Achievement",
      description: "Points by highest sports level reached.",
      maxPoints: 5,
      order: 7,
      method: "dropdown",
      sourceFieldKey: "sports_position",
      config: {
        method: "dropdown",
        pointsMap: { None: 0, "Inter-University": 2, National: 3, International: 5 },
        defaultPoints: 0,
      },
    },
  ];

  const version = await prisma.scoringPatternVersion.create({
    data: {
      patternId: pattern.id,
      versionNumber: 1,
      maxScore: 100,
      status: "published",
      publishedAt: daysAgo(20),
      criteria: {
        create: criteriaDefs.map((c) => ({
          name: c.name,
          description: c.description,
          maxPoints: c.maxPoints,
          order: c.order,
          method: c.method,
          sourceFieldId: c.sourceFieldKey ? fieldByKey.get(c.sourceFieldKey)!.id : null,
          configJson: JSON.stringify(c.config),
        })),
      },
    },
    include: { criteria: { include: { sourceField: true } } },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: nbgsm.id,
      actorId: nbgsmAdmin.id,
      actorName: nbgsmAdmin.name,
      action: "scoring_pattern.version_published",
      entityType: "ScoringPatternVersion",
      entityId: version.id,
      metadataJson: JSON.stringify({ patternId: pattern.id, versionNumber: 1 }),
      createdAt: daysAgo(20),
    },
  });

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
      scoringPatternId: pattern.id,
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
      scoringPatternId: pattern.id,
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
      scoringPatternId: pattern.id,
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
    calculateAgainstVersion?: boolean;
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

    if (opts.calculateAgainstVersion) {
      const values = await prisma.applicationFieldValue.findMany({
        where: { applicationId: application.id },
        include: { field: true },
      });
      const valueMap: ApplicationValueMap = {};
      for (const v of values) {
        valueMap[v.field.fieldKey] = { text: v.valueText, number: v.valueNumber, json: null };
      }
      const criteriaInput: CriterionInput[] = version.criteria.map((c) => ({
        id: c.id,
        name: c.name,
        method: c.method as CriterionInput["method"],
        maxPoints: c.maxPoints,
        order: c.order,
        sourceFieldKey: c.sourceField?.fieldKey ?? null,
        config: JSON.parse(c.configJson),
      }));
      const result = calculateScore(criteriaInput, valueMap, version.maxScore);

      await prisma.applicationScore.create({
        data: {
          applicationId: application.id,
          versionId: version.id,
          calculatedScore: result.totalScore,
          calculatedMaxScore: result.maxScore,
          calculatedBreakdownJson: JSON.stringify(result.breakdown),
          calculatedAt: opts.submittedAt ?? opts.createdAt,
        },
      });

      await prisma.auditLog.create({
        data: {
          tenantId: nbgsm.id,
          actorName: "System",
          action: "score.calculated",
          entityType: "Application",
          entityId: application.id,
          metadataJson: JSON.stringify({ totalScore: result.totalScore }),
          createdAt: opts.submittedAt ?? opts.createdAt,
        },
      });
    }

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
    calculateAgainstVersion: true,
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
    calculateAgainstVersion: true,
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
    calculateAgainstVersion: true,
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
    calculateAgainstVersion: true,
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
    calculateAgainstVersion: true,
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
    calculateAgainstVersion: false,
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
      description: "Newly opened position. Application form and scoring pattern are not configured yet.",
      status: "draft",
      numberOfPositions: 1,
    },
  });

  // Deliberately no ApplicationForm, no ScoringPattern, no applications for
  // Greenview — this is what a brand-new tenant looks like before its admin
  // configures anything.

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
