import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES, type ApplicationStatus } from "@/lib/enums";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardData(tenantId: string) {
  const todayStart = startOfToday();

  const [
    totalApplications,
    statusGroups,
    documentsPending,
    todaysApplications,
    todaysShortlisted,
    todaysRejected,
    recentActivity,
    missingDocumentsApps,
  ] = await Promise.all([
    prisma.application.count({ where: { tenantId } }),
    prisma.application.groupBy({ by: ["status"], where: { tenantId }, _count: { _all: true } }),
    prisma.document.count({ where: { tenantId, verified: false } }),
    prisma.application.count({ where: { tenantId, createdAt: { gte: todayStart } } }),
    prisma.application.count({ where: { tenantId, status: "shortlisted", updatedAt: { gte: todayStart } } }),
    prisma.application.count({ where: { tenantId, status: "rejected", updatedAt: { gte: todayStart } } }),
    prisma.auditLog.findMany({
      where: { tenantId },
      orderBy: { createdAt: "desc" },
      take: 12,
    }),
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
  ]);

  const pendingReviewApps = await prisma.application.findMany({
    where: { tenantId, status: "submitted" },
    include: { candidate: true, job: true },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

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
      documentsPending,
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
    recentActivity,
  };
}
