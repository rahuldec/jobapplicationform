import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncTenantSheet } from "../../../../prisma/sheet-import/sync";

export const maxDuration = 300;

export async function POST() {
  try {
    console.log(`[${new Date().toISOString()}] Manual sync triggered...`);

    const tenants = await prisma.tenant.findMany({
      where: { sheetSourceUrl: { not: null } },
      select: { id: true, slug: true, name: true },
    });

    if (tenants.length === 0) {
      return NextResponse.json({ ok: true, results: {}, message: "No tenants configured" });
    }

    const results: Record<string, any> = {};
    let anyFailed = false;

    for (const tenant of tenants) {
      try {
        const result = await syncTenantSheet(prisma, tenant.slug);
        results[tenant.slug] = { success: true, ...result };
        console.log(`✓ [${tenant.slug}] Synced: ${result.imported} imported, ${result.updated} updated`);
      } catch (err) {
        anyFailed = true;
        const message = err instanceof Error ? err.message : String(err);
        results[tenant.slug] = { success: false, error: message };
        console.error(`✗ [${tenant.slug}] ${message}`);
      }
    }

    return NextResponse.json({ ok: !anyFailed, results }, { status: anyFailed ? 500 : 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Manual sync error:", message);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
