"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES } from "@/lib/enums";
import { persistScore } from "@/lib/scoring/data";

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

export async function calculateScoreAction(formData: FormData) {
  const applicationId = String(formData.get("applicationId"));
  const versionId = String(formData.get("versionId"));
  await persistScore(applicationId, versionId, "Admin");

  revalidatePath(`/applications/${applicationId}`);
  revalidatePath("/applications");
}

export async function overrideScoreAction(formData: FormData) {
  const scoreId = String(formData.get("scoreId"));
  const overrideScore = Number(formData.get("overrideScore"));
  const overrideReason = String(formData.get("overrideReason") ?? "").trim();

  if (Number.isNaN(overrideScore)) throw new Error("Override score must be a number");
  if (!overrideReason) throw new Error("An override reason is required");

  const score = await prisma.applicationScore.update({
    where: { id: scoreId },
    data: {
      overrideScore,
      overrideReason,
      overriddenAt: new Date(),
    },
  });

  const application = await prisma.application.findUniqueOrThrow({ where: { id: score.applicationId } });

  await prisma.auditLog.create({
    data: {
      tenantId: application.tenantId,
      actorName: "Admin",
      action: "score.overridden",
      entityType: "Application",
      entityId: application.id,
      metadataJson: JSON.stringify({ overrideScore, overrideReason }),
    },
  });

  revalidatePath(`/applications/${application.id}`);
  revalidatePath("/applications");
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
