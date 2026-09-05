/**
 * Local sync runner — call via cron on your machine to pull new Sheet rows
 * for all tenants. No Vercel dependency, no firewall issues.
 *
 * Usage: npx tsx -r dotenv/config sync-local.ts
 * Cron: every 15 minutes: 0,15,30,45 * * * * (see setup instructions below)
 */

import { prisma } from "./src/lib/prisma";
import { syncTenantSheet } from "./prisma/sheet-import/sync";

async function main() {
  console.log(`[${new Date().toISOString()}] Starting sheet sync for all tenants...`);

  const tenants = await prisma.tenant.findMany({
    where: { sheetSourceUrl: { not: null } },
    select: { id: true, slug: true, name: true },
  });

  if (tenants.length === 0) {
    console.log("No tenants with Sheet URLs configured.");
    process.exit(0);
  }

  let succeeded = 0,
    failed = 0;

  for (const tenant of tenants) {
    try {
      const result = await syncTenantSheet(prisma, tenant.slug);
      console.log(
        `✓ [${tenant.slug}] ${tenant.name}: ${result.created} created, ${result.skipped} skipped, ${result.alreadyImported} already imported`
      );
      succeeded++;
    } catch (err) {
      console.error(`✗ [${tenant.slug}] ${tenant.name}: ${err instanceof Error ? err.message : err}`);
      failed++;
    }
  }

  console.log(
    `[${new Date().toISOString()}] Sync complete: ${succeeded} succeeded, ${failed} failed.`
  );
  process.exit(failed > 0 ? 1 : 0);
}

main();
