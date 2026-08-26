"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES } from "@/lib/enums";

function invalidateApplicationsViews() {
  revalidatePath("/applications");
  revalidatePath("/dashboard");
}

export async function changeApplicationStatus(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const status = String(formData.get("status"));
  if (!APPLICATION_STATUSES.includes(status as never)) throw new Error("Invalid status");

  const application = await prisma.application.update({
    where: { id: applicationId },
    data: { status },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: application.tenantId,
      actorName: "Admin",
      action: "application.status_changed",
      entityType: "Application",
      entityId: application.id,
      metadataJson: JSON.stringify({ status }),
    },
  });

  revalidatePath(`/applications/${applicationId}`);
  invalidateApplicationsViews();
}

// Bulk variant of changeApplicationStatus, for the Applications list's
// multi-select toolbar. updateMany can't return the affected rows, so
// audit entries are built from the id list directly rather than from
// each row's real data (candidate name isn't available without a second
// query) — same tradeoff the export routes already make for bulk ops.
export async function bulkChangeApplicationStatus(input: { applicationIds: string[]; status: string }) {
  const { applicationIds, status } = input;
  if (!APPLICATION_STATUSES.includes(status as never)) throw new Error("Invalid status");
  if (applicationIds.length === 0) return { count: 0 };

  const apps = await prisma.application.findMany({
    where: { id: { in: applicationIds } },
    select: { id: true, tenantId: true },
  });
  if (apps.length === 0) return { count: 0 };

  await prisma.application.updateMany({
    where: { id: { in: apps.map((a) => a.id) } },
    data: { status },
  });

  await prisma.auditLog.createMany({
    data: apps.map((a) => ({
      tenantId: a.tenantId,
      actorName: "Admin",
      action: "application.status_changed",
      entityType: "Application",
      entityId: a.id,
      metadataJson: JSON.stringify({ status, bulk: true }),
    })),
  });

  for (const a of apps) revalidatePath(`/applications/${a.id}`);
  invalidateApplicationsViews();
  return { count: apps.length };
}

// recruiterId of null clears the assignment (unassign).
export async function bulkAssignRecruiter(input: { applicationIds: string[]; recruiterId: string | null }) {
  const { applicationIds, recruiterId } = input;
  if (applicationIds.length === 0) return { count: 0 };

  const apps = await prisma.application.findMany({
    where: { id: { in: applicationIds } },
    select: { id: true, tenantId: true },
  });
  if (apps.length === 0) return { count: 0 };

  let recruiterName = "Unassigned";
  if (recruiterId) {
    const recruiter = await prisma.user.findUniqueOrThrow({ where: { id: recruiterId } });
    recruiterName = recruiter.name;
  }

  await prisma.application.updateMany({
    where: { id: { in: apps.map((a) => a.id) } },
    data: { assignedRecruiterId: recruiterId },
  });

  await prisma.auditLog.createMany({
    data: apps.map((a) => ({
      tenantId: a.tenantId,
      actorName: "Admin",
      action: "application.assigned",
      entityType: "Application",
      entityId: a.id,
      metadataJson: JSON.stringify({ recruiterId, recruiterName, bulk: true }),
    })),
  });

  for (const a of apps) revalidatePath(`/applications/${a.id}`);
  invalidateApplicationsViews();
  return { count: apps.length };
}

export async function verifyDocumentAction(formData: FormData) {
  const documentId = String(formData.get("documentId"));
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { verified: true, verifiedBy: "Admin", verifiedAt: new Date() },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: doc.tenantId,
      actorName: "Admin",
      action: "document.verified",
      entityType: "Document",
      entityId: doc.id,
    },
  });

  revalidatePath(`/applications/${doc.applicationId}`);
  revalidatePath("/dashboard");
}

export async function unverifyDocumentAction(formData: FormData) {
  const documentId = String(formData.get("documentId"));
  const doc = await prisma.document.update({
    where: { id: documentId },
    data: { verified: false, verifiedBy: null, verifiedAt: null },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: doc.tenantId,
      actorName: "Admin",
      action: "document.unverified",
      entityType: "Document",
      entityId: doc.id,
    },
  });

  revalidatePath(`/applications/${doc.applicationId}`);
  revalidatePath("/dashboard");
}
