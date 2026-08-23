import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { Card, EmptyState, Badge, Button } from "@/components/ui/primitives";

export default async function ScoringPatternsPage() {
  const tenant = await getCurrentTenant();

  const patterns = await prisma.scoringPattern.findMany({
    where: { tenantId: tenant.id },
    include: {
      versions: { orderBy: { versionNumber: "desc" } },
      jobs: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-slate-900">Scoring Patterns</h1>
          <p className="text-sm text-slate-500">{tenant.name}</p>
        </div>
        <Link href="/scoring/new">
          <Button>+ Create Scoring Pattern</Button>
        </Link>
      </div>

      {patterns.length === 0 ? (
        <Card>
          <EmptyState
            title="No scoring patterns yet"
            description="This tenant has not configured any scoring methodology. Create a pattern to start defining criteria."
            action={
              <Link href="/scoring/new">
                <Button variant="secondary">+ Create Scoring Pattern</Button>
              </Link>
            }
          />
        </Card>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {patterns.map((p) => {
            const published = p.versions.find((v) => v.status === "published");
            const draft = p.versions.find((v) => v.status === "draft");
            return (
              <Link key={p.id} href={`/scoring/${p.id}`}>
                <Card className="h-full p-5 transition-colors hover:border-orange-300">
                  <p className="font-medium text-slate-900">{p.name}</p>
                  {p.description ? <p className="mt-1 text-sm text-slate-500 line-clamp-2">{p.description}</p> : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {published ? (
                      <Badge tone="green">Published v{published.versionNumber} · max {published.maxScore ?? "—"}</Badge>
                    ) : (
                      <Badge tone="amber">No published version</Badge>
                    )}
                    {draft ? <Badge tone="slate">Draft v{draft.versionNumber}</Badge> : null}
                    <Badge tone="slate">{p.jobs.length} job(s) using this</Badge>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
