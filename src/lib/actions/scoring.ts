"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { createDraftVersion, publishVersion } from "@/lib/scoring/versioning";
import { criterionConfigSchema } from "@/lib/scoring/types";
import { calculateForVersion } from "@/lib/scoring/data";

export async function createScoringPattern(formData: FormData) {
  const tenant = await getCurrentTenant();
  const name = String(formData.get("name") ?? "").trim();
  if (!name) throw new Error("Pattern name is required");
  const description = String(formData.get("description") ?? "").trim() || null;
  const maxScoreRaw = formData.get("maxScore");
  const maxScore = maxScoreRaw ? Number(maxScoreRaw) : null;

  const pattern = await prisma.scoringPattern.create({
    data: { tenantId: tenant.id, name, description },
  });

  // First version starts completely blank — zero predefined criteria.
  await prisma.scoringPatternVersion.create({
    data: { patternId: pattern.id, versionNumber: 1, maxScore, status: "draft" },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: tenant.id,
      actorName: "Admin",
      action: "scoring_pattern.created",
      entityType: "ScoringPattern",
      entityId: pattern.id,
    },
  });

  redirect(`/scoring/${pattern.id}`);
}

export async function saveCriterion(formData: FormData) {
  const criterionId = String(formData.get("criterionId") ?? "") || null;
  const versionId = String(formData.get("versionId"));
  const patternId = String(formData.get("patternId"));
  const name = String(formData.get("name") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim() || null;
  const maxPoints = Number(formData.get("maxPoints"));
  const method = String(formData.get("method"));
  const sourceFieldId = String(formData.get("sourceFieldId") ?? "") || null;
  const configJsonRaw = String(formData.get("configJson") ?? "{}");

  if (!name) throw new Error("Criterion name is required");
  if (Number.isNaN(maxPoints) || maxPoints < 0) throw new Error("Max points must be a non-negative number");

  const config = criterionConfigSchema.parse(JSON.parse(configJsonRaw));

  const version = await prisma.scoringPatternVersion.findUniqueOrThrow({ where: { id: versionId } });
  if (version.status !== "draft") {
    throw new Error("Only draft versions can be edited. Create a new version first.");
  }

  if (criterionId) {
    await prisma.scoringCriterion.update({
      where: { id: criterionId },
      data: { name, description, maxPoints, method, sourceFieldId, configJson: JSON.stringify(config) },
    });
  } else {
    const count = await prisma.scoringCriterion.count({ where: { versionId } });
    await prisma.scoringCriterion.create({
      data: {
        versionId,
        name,
        description,
        maxPoints,
        method,
        sourceFieldId,
        configJson: JSON.stringify(config),
        order: count + 1,
      },
    });
  }

  redirect(`/scoring/${patternId}`);
}

export async function deleteCriterion(formData: FormData) {
  const criterionId = String(formData.get("criterionId"));
  const patternId = String(formData.get("patternId"));
  const criterion = await prisma.scoringCriterion.findUniqueOrThrow({
    where: { id: criterionId },
    include: { version: true },
  });
  if (criterion.version.status !== "draft") {
    throw new Error("Only draft versions can be edited.");
  }
  await prisma.scoringCriterion.delete({ where: { id: criterionId } });
  redirect(`/scoring/${patternId}`);
}

export async function createNewDraftVersionAction(formData: FormData) {
  const patternId = String(formData.get("patternId"));
  await createDraftVersion(patternId);
  redirect(`/scoring/${patternId}`);
}

export async function publishVersionAction(formData: FormData) {
  const patternId = String(formData.get("patternId"));
  const versionId = String(formData.get("versionId"));
  await publishVersion(versionId);
  redirect(`/scoring/${patternId}`);
}

export async function updateVersionMaxScore(formData: FormData) {
  const patternId = String(formData.get("patternId"));
  const versionId = String(formData.get("versionId"));
  const maxScoreRaw = formData.get("maxScore");
  const maxScore = maxScoreRaw && maxScoreRaw !== "" ? Number(maxScoreRaw) : null;
  await prisma.scoringPatternVersion.update({ where: { id: versionId }, data: { maxScore } });
  redirect(`/scoring/${patternId}`);
}

export async function testScore(applicationId: string, versionId: string) {
  return calculateForVersion(applicationId, versionId);
}
