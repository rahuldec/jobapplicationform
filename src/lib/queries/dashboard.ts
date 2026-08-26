import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/enums";
import { startOfTodayIST } from "@/lib/date";

export async function getDashboardData(tenantId: string) {
  const todayStart = startOfTodayIST();

  const [totalApplications, statusGroups, todaysApplications, todaysShortlisted, todaysRejected, missingDocumentsApps, emailsSent] =
    await Promise.all([
      prisma.application.count({ where: { tenantId } }),
      prisma.application.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
      prisma.application.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
      prisma.application.count({ where: { tenantId, status: "shortlisted", updatedAt: { gte: todayStart } } }),
      prisma.application.count({ where: { tenantId, status: "rejected", updatedAt: { gte: todayStart } } }),
      prisma.application.findMany({
        where: {
          tenantId,
          status: { in: ["submitted", "under_review", "shortlisted"] },
          documents: { none: {} },
        },
        include: { candidate: true, job: true },
        take: 5,
        orderBy: { createdAt: "desc" },
      }),
      prisma.auditLog.count({ where: { tenantId, action: "email.sent" } }),
    ]);

  const pendingReviewApps = await prisma.application.findMany({
    where: { tenantId, status: "submitted" },
    include: { candidate: true, job: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  const [byJobGroups, jobs] = await Promise.all([
    prisma.application.groupBy({ by: ["jobId"], where: { tenantId }, _count: { _all: true } }),
    prisma.job.findMany({ where: { tenantId }, select: { id: true, title: true } }),
  ]);

  const jobTitleById = new Map(jobs.map((j) => [j.id, j.title]));
  const byJob = byJobGroups
    .map((g) => ({ jobTitle: jobTitleById.get(g.jobId) ?? "Unknown", count: g._count._all }))
    .sort((a, b) => b.count - a.count);

  // Same statuses as the Applications page's own filter dropdown, so the
  // dashboard's stages always match 1:1 with what you can filter by there.
  const byStatus = Object.fromEntries(APPLICATION_STATUSES.map((s) => [s, 0])) as Record<ApplicationStatus, number>;
  for (const g of statusGroups) {
    byStatus[g.status as ApplicationStatus] = g._count._all;
  }

  return {
    stats: {
      totalApplications,
      byStatus,
      emailsSent,
    },
    analytics: {
      byJob,
    },
    today: {
      newApplications: todaysApplications,
      shortlisted: todaysShortlisted,
      rejected: todaysRejected,
    },
    attentionRequired: {
      pendingReviewApps,
      missingDocumentsApps,
    },
  };
}
