"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES } from "@/lib/enums";

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
  revalidatePath("/applications");
  revalidatePath("/dashboard");
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
