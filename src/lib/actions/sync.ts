"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { syncTenantSheet } from "../../../prisma/sheet-import/sync";

// Manual "Sync now" for whoever's looking at the dashboard, instead of
// waiting for the once-a-day cron or someone running a curl command with
// the cron secret. Scoped to whichever tenant the caller's browser is
// currently on — same tenant-resolution every other page action uses.
export async function triggerSheetSyncForCurrentTenant() {
  const tenant = await getCurrentTenant();
  if (!tenant.sheetSourceUrl) {
    throw new Error("No Google Sheet is connected for this tenant yet.");
  }

  const result = await syncTenantSheet(prisma, tenant.slug);

  revalidatePath("/dashboard");
  revalidatePath("/applications");

  return result;
}
