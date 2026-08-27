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
      setMessage(`Synced — ${result.created} new, ${result.skipped} skipped, ${result.alreadyImported} already imported.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Sync failed.");
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1">
      <Button variant="secondary" size="sm" onClick={handleClick} disabled={syncing}>
        {syncing ? "Syncing…" : "Sync now"}
      </Button>
      {message && <span className="max-w-xs text-right text-xs text-slate-500">{message}</span>}
    </div>
  );
}
