"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/primitives";
import { triggerSheetSyncForCurrentTenant } from "@/lib/actions/sync";

export function SyncNowButton() {
  const router = useRouter();
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleClick = async () => {
    setSyncing(true);
    setMessage(null);
    try {
      const result = await triggerSheetSyncForCurrentTenant();
      const jobPart = result.jobsReassigned > 0 ? `, ${result.jobsReassigned} moved to a different job` : "";
      setMessage(`Synced — ${result.created} new, ${result.skipped} skipped${jobPart}, ${result.alreadyImported} already imported.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={handleClick}
        disabled={syncing}
        className="rounded-full border border-white/40 bg-white/15 px-3.5 py-1 text-[13px] font-semibold text-white backdrop-blur-sm transition hover:bg-white/25 disabled:opacity-60"
      >
        {syncing ? "Syncing…" : "Sync now"}
      </button>
      {message && <span className="max-w-xs text-right text-[11px] text-white/70">{message}</span>}
    </div>
  );
}
