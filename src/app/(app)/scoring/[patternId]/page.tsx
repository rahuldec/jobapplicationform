import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import {
  createNewDraftVersionAction,
  publishVersionAction,
  updateVersionMaxScore,
} from "@/lib/actions/scoring";
import { Card, CardHeader, Badge, Button, Field, inputClass } from "@/components/ui/primitives";
import { CriteriaBuilder, type CriterionRow } from "@/components/scoring/criteria-builder";
import { ScoreTester } from "@/components/scoring/score-tester";
import type { SourceFieldOption } from "@/components/scoring/criterion-form";
import type { ScoringMethod } from "@/lib/enums";

export default async function ScoringPatternDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ patternId: string }>;
  searchParams: Promise<{ version?: string }>;
}) {
  const { patternId } = await params;
  const { version: versionParam } = await searchParams;
  const tenant = await getCurrentTenant();

  const pattern = await prisma.scoringPattern.findUnique({
    where: { id: patternId },
    include: {
      versions: {
        orderBy: { versionNumber: "desc" },
        include: { criteria: { include: { sourceField: true }, orderBy: { order: "asc" } } },
      },
      jobs: true,
    },
  });

  if (!pattern) notFound();

  const activeVersion =
    pattern.versions.find((v) => v.id === versionParam) ??
    pattern.versions.find((v) => v.status === "draft") ??
    pattern.versions[0];

  const [forms, applications] = await Promise.all([
    prisma.applicationForm.findMany({
      where: { tenantId: tenant.id },
      include: { sections: { include: { fields: true } } },
    }),
    prisma.application.findMany({
      where: { tenantId: tenant.id },
      include: { candidate: true },
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  const sourceFields: SourceFieldOption[] = forms.flatMap((f) =>
    f.sections.flatMap((s) =>
      s.fields.map((field) => ({
        id: field.id,
        fieldKey: field.fieldKey,
        label: field.label,
        formName: f.name,
        optionsJson: field.optionsJson,
      })),
    ),
  );

  const criteriaRows: CriterionRow[] =
    activeVersion?.criteria.map((c) => ({
      id: c.id,
      name: c.name,
      description: c.description,
      maxPoints: c.maxPoints,
      method: c.method as ScoringMethod,
      sourceFieldId: c.sourceFieldId,
      sourceFieldLabel: c.sourceField?.label ?? null,
      config: JSON.parse(c.configJson),
    })) ?? [];

  const isEditable = activeVersion?.status === "draft";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-semibold text-slate-900">{pattern.name}</h1>
          </div>
          {pattern.description ? <p className="text-sm text-slate-500">{pattern.description}</p> : null}
          <p className="mt-1 text-xs text-slate-400">
            Used by {pattern.jobs.length} job(s):{" "}
            {pattern.jobs.map((j) => j.title).join(", ") || "none yet"}
          </p>
        </div>
        <form action={createNewDraftVersionAction}>
          <input type="hidden" name="patternId" value={pattern.id} />
          <Button type="submit" variant="secondary" size="sm">
            + New Draft Version
          </Button>
        </form>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {pattern.versions.map((v) => (
          <Link
            key={v.id}
            href={`/scoring/${pattern.id}?version=${v.id}`}
            className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium ${
              activeVersion?.id === v.id
                ? "bg-orange-100 text-orange-700"
                : "bg-white text-slate-600 ring-1 ring-inset ring-slate-200 hover:bg-slate-50"
            }`}
          >
            v{v.versionNumber}
            <Badge tone={v.status === "published" ? "green" : v.status === "draft" ? "amber" : "slate"}>
              {v.status}
            </Badge>
          </Link>
        ))}
      </div>

      {activeVersion ? (
        <>
          <Card>
            <CardHeader
              title={`Version ${activeVersion.versionNumber}`}
              description={isEditable ? "Draft — editable" : "Not editable — create a new draft version to make changes"}
              action={
                isEditable && criteriaRows.length > 0 ? (
                  <form action={publishVersionAction} className="flex items-center gap-2">
                    <input type="hidden" name="patternId" value={pattern.id} />
                    <input type="hidden" name="versionId" value={activeVersion.id} />
                    <Button type="submit" size="sm">
                      Publish
                    </Button>
                  </form>
                ) : null
              }
            />
            <div className="px-5 py-4">
              {isEditable ? (
                <form action={updateVersionMaxScore} className="flex items-end gap-3">
                  <input type="hidden" name="patternId" value={pattern.id} />
                  <input type="hidden" name="versionId" value={activeVersion.id} />
                  <Field label="Maximum score" hint="Admin-defined. Leave blank for no fixed maximum.">
                    <input
                      name="maxScore"
                      type="number"
                      step="0.01"
                      defaultValue={activeVersion.maxScore ?? ""}
                      className={`${inputClass} w-40`}
                    />
                  </Field>
                  <Button type="submit" variant="secondary" size="sm">
                    Save
                  </Button>
                </form>
              ) : (
                <p className="text-sm text-slate-600">
                  Maximum score: <span className="font-medium">{activeVersion.maxScore ?? "Not set"}</span>
                  {activeVersion.publishedAt
                    ? ` · Published ${new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(activeVersion.publishedAt)}`
                    : ""}
                </p>
              )}
            </div>
          </Card>

          <Card className="p-5">
            <CriteriaBuilder
              patternId={pattern.id}
              versionId={activeVersion.id}
              criteria={criteriaRows}
              sourceFields={sourceFields}
              editable={isEditable}
            />
          </Card>

          {criteriaRows.length > 0 && (
            <ScoreTester
              versionId={activeVersion.id}
              applications={applications.map((a) => ({
                id: a.id,
                label: `${a.candidate.fullName} — ${a.applicationNumber}`,
              }))}
            />
          )}
        </>
      ) : (
        <Card className="p-5 text-sm text-slate-500">No versions exist for this pattern.</Card>
      )}
    </div>
  );
}
