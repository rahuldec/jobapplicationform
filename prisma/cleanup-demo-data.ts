// One-off cleanup: remove every hand-built demo/example record, keeping
// only genuine data imported from the real NBGSM spreadsheet, then reset
// all remaining applications to "submitted" (the actual sheet has no
// status/decision column, so every real application starts there).
import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 2 });
const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

const DEMO_APPLICATION_NUMBERS = [
  "NBGSM-2026-0001",
  "NBGSM-2026-0002",
  "NBGSM-2026-0003",
  "NBGSM-2026-0004",
  "NBGSM-2026-0005",
  "NBGSM-2026-0006",
];
const DEMO_JOB_TITLES = ["Assistant Professor — Commerce", "Assistant Professor — Hindi", "Assistant Professor — English"];
const DEMO_FORM_NAME = "Assistant Professor Application — Standard";
const DEMO_PATTERN_NAME_CONTAINS = "UGC-style Academic Performance Indicator";

async function main() {
  // 1. Greenview demo tenant — cascades everything under it.
  const greenview = await prisma.tenant.findUnique({ where: { slug: "greenview" } });
  if (greenview) {
    await prisma.tenant.delete({ where: { id: greenview.id } });
    console.log(`Deleted tenant "${greenview.name}" and everything under it.`);
  }

  // 2. Demo applications under NBGSM (cascades field values, documents, scores).
  const demoApps = await prisma.application.findMany({
    where: { applicationNumber: { in: DEMO_APPLICATION_NUMBERS } },
    select: { id: true, candidateId: true, applicationNumber: true },
  });
  const demoAppIds = demoApps.map((a) => a.id);
  if (demoAppIds.length) {
    await prisma.auditLog.deleteMany({ where: { entityType: "Application", entityId: { in: demoAppIds } } });
    await prisma.application.deleteMany({ where: { id: { in: demoAppIds } } });
    console.log(`Deleted ${demoAppIds.length} demo applications: ${demoApps.map((a) => a.applicationNumber).join(", ")}`);
  }

  // 3. Candidates who only ever had demo applications (no real imported one left).
  const candidateIds = [...new Set(demoApps.map((a) => a.candidateId))];
  let removedCandidates = 0;
  for (const candidateId of candidateIds) {
    const remaining = await prisma.application.count({ where: { candidateId } });
    if (remaining === 0) {
      const c = await prisma.candidate.delete({ where: { id: candidateId } });
      removedCandidates++;
      console.log(`  Removed orphaned demo-only candidate: ${c.fullName} (${c.email})`);
    }
  }

  // 4. Demo jobs (now safe — their applications are gone).
  const demoJobs = await prisma.job.findMany({ where: { title: { in: DEMO_JOB_TITLES } } });
  if (demoJobs.length) {
    await prisma.job.deleteMany({ where: { id: { in: demoJobs.map((j) => j.id) } } });
    console.log(`Deleted ${demoJobs.length} demo jobs: ${demoJobs.map((j) => j.title).join(", ")}`);
  }

  // 5. Demo scoring pattern (cascades versions + criteria). Must come after
  // the demo jobs (which referenced it) are gone. Audit logs reference
  // entities by a bare id string (no FK), so they don't cascade — clean
  // those up explicitly first.
  const demoPattern = await prisma.scoringPattern.findFirst({
    where: { name: { contains: DEMO_PATTERN_NAME_CONTAINS } },
    include: { versions: true },
  });
  if (demoPattern) {
    const entityIds = [demoPattern.id, ...demoPattern.versions.map((v) => v.id)];
    const { count } = await prisma.auditLog.deleteMany({ where: { entityId: { in: entityIds } } });
    await prisma.scoringPattern.delete({ where: { id: demoPattern.id } });
    console.log(`Deleted demo scoring pattern "${demoPattern.name}" and ${count} related audit log entr${count === 1 ? "y" : "ies"}.`);
  }

  // 6. Demo application form (cascades sections + fields). Must come after
  // the demo jobs (formId) and pattern criteria (sourceFieldId) are gone.
  const demoForm = await prisma.applicationForm.findFirst({ where: { name: DEMO_FORM_NAME } });
  if (demoForm) {
    await prisma.applicationForm.delete({ where: { id: demoForm.id } });
    console.log(`Deleted demo application form "${demoForm.name}".`);
  }

  // 7. Demo staff users seeded alongside the demo tenant data. Audit logs
  // set actorId as a real FK here, so those rows must go first.
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: ["admin@nbgsm.ac.in", "recruiter@nbgsm.ac.in"] } },
  });
  if (demoUsers.length) {
    const userIds = demoUsers.map((u) => u.id);
    await prisma.auditLog.deleteMany({ where: { actorId: { in: userIds } } });
    await prisma.user.deleteMany({ where: { id: { in: userIds } } });
    console.log(`Deleted ${demoUsers.length} demo user(s): ${demoUsers.map((u) => u.name).join(", ")}.`);
  }

  // 8. Reset every remaining (genuine) application to "submitted".
  const result = await prisma.application.updateMany({
    where: { status: { not: "submitted" } },
    data: { status: "submitted" },
  });
  console.log(`Set ${result.count} application(s) to "submitted".`);

  const finalCount = await prisma.application.count();
  const finalTenants = await prisma.tenant.findMany({ select: { name: true } });
  console.log(`\nDone. ${finalCount} applications remain, across tenant(s): ${finalTenants.map((t) => t.name).join(", ")}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
