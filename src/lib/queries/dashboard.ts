import { prisma } from "@/lib/prisma";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function getDashboardData(tenantId: string) {
  const todayStart = startOfToday();

  const [
    totalApplications,
    pendingReview,
    shortlisted,
    interviews,
    selected,
    rejected,
    documentsPending,
    todaysApplications,
    todaysShortlisted,
    todaysRejected,
    recentActivity,
    missingDocumentsApps,
  ] = await Promise.all([
    prisma.application.count({ where: { tenantId } }),
    prisma.application.count({ where: { tenantId, status: { in: ["submitted", "under_review"] } } }),
    prisma.application.count({ where: { tenantId, status: "shortlisted" } }),
    prisma.application.count({ where: { tenantId, status: { in: ["interview_scheduled", "interviewed"] } } }),
    prisma.application.count({ where: { tenantId, status: "selected" } }),
    prisma.application.count({ where: { tenantId, status: "rejected" } }),
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

  return {
    stats: {
      totalApplications,
      pendingReview,
      shortlisted,
      interviews,
      selected,
      rejected,
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
