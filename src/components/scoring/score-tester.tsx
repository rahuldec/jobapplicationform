"use client";

import { useState, useTransition } from "react";
import { testScore } from "@/lib/actions/scoring";
import { Button, Card, CardHeader, inputClass, EmptyState } from "@/components/ui/primitives";
import type { ScoreResult } from "@/lib/scoring/types";

export function ScoreTester({
  versionId,
  applications,
}: {
  versionId: string;
  applications: { id: string; label: string }[];
}) {
  const [applicationId, setApplicationId] = useState(applications[0]?.id ?? "");
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    if (!applicationId) return;
    startTransition(async () => {
      const r = await testScore(applicationId, versionId);
      setResult(r);
    });
  }

  return (
    <Card>
      <CardHeader
        title="Test this pattern"
        description="Run the configured rules against a real application without saving a score."
      />
      <div className="space-y-4 px-5 py-5">
        {applications.length === 0 ? (
          <EmptyState title="No applications available to test against yet" />
        ) : (
          <div className="flex flex-wrap items-end gap-3">
            <div className="min-w-[260px]">
              <label className="block text-xs font-medium text-slate-600">Application</label>
              <select
                value={applicationId}
                onChange={(e) => setApplicationId(e.target.value)}
                className={`${inputClass} mt-1`}
              >
                {applications.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.label}
                  </option>
                ))}
              </select>
            </div>
            <Button onClick={run} disabled={pending}>
              {pending ? "Running…" : "Run Test"}
            </Button>
          </div>
        )}

        {result && (
          <div>
            <p className="text-2xl font-semibold tabular-nums text-slate-900">
              {result.totalScore} <span className="text-base font-normal text-slate-400">/ {result.maxScore ?? "?"}</span>
            </p>
            <table className="mt-4 w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                  <th className="py-2">Criterion</th>
                  <th className="py-2">Rule applied</th>
                  <th className="py-2 text-right">Result</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {result.breakdown.map((b) => (
                  <tr key={b.criterionId}>
                    <td className="py-2.5 font-medium text-slate-800">{b.name}</td>
                    <td className="py-2.5 text-slate-500">{b.detail}</td>
                    <td className="py-2.5 text-right tabular-nums text-slate-800">
                      {b.points} / {b.maxPoints}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </Card>
  );
}
