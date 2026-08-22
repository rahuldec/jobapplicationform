import { prisma } from "@/lib/prisma";
import type { ScoringMethod } from "@/lib/enums";
import { calculateScore, type CriterionInput } from "./engine";
import { criterionConfigSchema, type ApplicationValueMap, type ScoreResult } from "./types";

export async function buildValueMap(applicationId: string): Promise<ApplicationValueMap> {
  const values = await prisma.applicationFieldValue.findMany({
    where: { applicationId },
    include: { field: true },
  });

  const map: ApplicationValueMap = {};
  for (const v of values) {
    map[v.field.fieldKey] = {
      text: v.valueText,
      number: v.valueNumber,
      json: v.valueJson ? JSON.parse(v.valueJson) : null,
    };
  }
  return map;
}

export async function loadCriteriaForVersion(versionId: string): Promise<CriterionInput[]> {
  const rows = await prisma.scoringCriterion.findMany({
    where: { versionId },
    include: { sourceField: true },
    orderBy: { order: "asc" },
  });

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    method: row.method as ScoringMethod,
    maxPoints: row.maxPoints,
    order: row.order,
    sourceFieldKey: row.sourceField?.fieldKey ?? null,
    config: criterionConfigSchema.parse(JSON.parse(row.configJson)),
  }));
}

export async function calculateForVersion(
  applicationId: string,
  versionId: string,
): Promise<ScoreResult> {
  const [criteria, values, version] = await Promise.all([
    loadCriteriaForVersion(versionId),
    buildValueMap(applicationId),
    prisma.scoringPatternVersion.findUniqueOrThrow({ where: { id: versionId } }),
  ]);

  return calculateScore(criteria, values, version.maxScore ?? null);
}

export async function persistScore(
  applicationId: string,
  versionId: string,
  actorName: string,
  actorId?: string,
) {
  const result = await calculateForVersion(applicationId, versionId);
  const application = await prisma.application.findUniqueOrThrow({
    where: { id: applicationId },
  });

  const score = await prisma.applicationScore.upsert({
    where: { applicationId_versionId: { applicationId, versionId } },
    create: {
      applicationId,
      versionId,
      calculatedScore: result.totalScore,
      calculatedMaxScore: result.maxScore,
      calculatedBreakdownJson: JSON.stringify(result.breakdown),
    },
    update: {
      calculatedScore: result.totalScore,
      calculatedMaxScore: result.maxScore,
      calculatedBreakdownJson: JSON.stringify(result.breakdown),
      calculatedAt: new Date(),
      // Recalculating never touches a manual override — the override stays
      // in place until an admin explicitly changes or clears it.
    },
  });

  await prisma.auditLog.create({
    data: {
      tenantId: application.tenantId,
      actorId: actorId ?? null,
      actorName,
      action: "score.calculated",
      entityType: "Application",
      entityId: applicationId,
      metadataJson: JSON.stringify({ versionId, totalScore: result.totalScore }),
    },
  });

  return score;
}
