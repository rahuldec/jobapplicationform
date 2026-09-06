import { prisma } from "@/lib/prisma";
import { syncTenantSheet } from "../../prisma/sheet-import/sync";
import type { Tenant } from "@/generated/prisma/client";

const SYNC_INTERVAL_MS = 60_000;

// Called on every (app) page load/refresh so staff see new Sheet rows
// without hitting "Sync now" — throttled per tenant so a page refreshed
// five times in the same minute only actually hits the Sheet once.
export async function syncSheetIfStale(tenant: Tenant) {
  if (!tenant.sheetSourceUrl) return;
  if (tenant.lastSheetSyncAt && Date.now() - tenant.lastSheetSyncAt.getTime() < SYNC_INTERVAL_MS) return;

  try {
    await syncTenantSheet(prisma, tenant.slug);
  } catch (err) {
    // A page load should never fail just because the Sheet sync did —
    // same reasoning as the cron route, which logs and moves on per tenant.
    console.error(`Auto sync failed for tenant "${tenant.slug}":`, err);
  }
}
