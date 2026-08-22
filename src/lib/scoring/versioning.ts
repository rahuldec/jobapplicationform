import { prisma } from "@/lib/prisma";

// Scoring patterns are versioned so that editing a pattern never rewrites
// history: a published version's criteria are effectively frozen, and any
// score ever calculated against it keeps pointing at that exact version
// (Rule 10 — historical records preserve the configuration used at the time).

export async function createDraftVersion(patternId: string, cloneFromVersionId?: string) {
  const latest = await prisma.scoringPatternVersion.findFirst({
    where: { patternId },
    orderBy: { versionNumber: "desc" },
  });

  const nextVersionNumber = (latest?.versionNumber ?? 0) + 1;

  const sourceVersionId = cloneFromVersionId ?? latest?.id;
  const sourceCriteria = sourceVersionId
    ? await prisma.scoringCriterion.findMany({ where: { versionId: sourceVersionId } })
    : [];

  const version = await prisma.scoringPatternVersion.create({
    data: {
      patternId,
      versionNumber: nextVersionNumber,
      maxScore: latest?.maxScore ?? null,
      status: "draft",
      criteria: {
        create: sourceCriteria.map((c) => ({
          name: c.name,
          description: c.description,
          maxPoints: c.maxPoints,
          order: c.order,
          method: c.method,
          sourceFieldId: c.sourceFieldId,
          configJson: c.configJson,
        })),
      },
    },
  });

  return version;
}

export async function publishVersion(versionId: string) {
  const version = await prisma.scoringPatternVersion.findUniqueOrThrow({
    where: { id: versionId },
  });

  await prisma.$transaction([
    prisma.scoringPatternVersion.updateMany({
      where: { patternId: version.patternId, status: "published" },
      data: { status: "archived" },
    }),
    prisma.scoringPatternVersion.update({
      where: { id: versionId },
      data: { status: "published", publishedAt: new Date() },
    }),
  ]);

  await prisma.auditLog.create({
    data: {
      actorName: "System",
      action: "scoring_pattern.version_published",
      entityType: "ScoringPatternVersion",
      entityId: versionId,
      metadataJson: JSON.stringify({ patternId: version.patternId, versionNumber: version.versionNumber }),
    },
  });

  return version;
}
