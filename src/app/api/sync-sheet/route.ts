import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncTenantSheet } from "../../../../prisma/sheet-import/sync";

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  // Vercel Cron automatically sends "Authorization: Bearer $CRON_SECRET"
  // when that env var is set on the project — no extra wiring needed for
  // scheduled invocations, only for manual ones.
  const auth = request.headers.get("authorization");
  const expected = `Bearer ${process.env.CRON_SECRET}`;
  if (!process.env.CRON_SECRET || auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const requestedSlug = request.nextUrl.searchParams.get("tenant");

  // No `?tenant=` means "sync every tenant that has a Sheet configured" —
  // so the one scheduled cron run stays correct as new clients get
  // onboarded, instead of needing a new cron entry per client.
  const slugs = requestedSlug
    ? [requestedSlug]
    : (await prisma.tenant.findMany({ where: { sheetSourceUrl: { not: null } }, select: { slug: true } })).map((t) => t.slug);

  const results: Record<string, unknown> = {};
  let anyFailed = false;
  for (const slug of slugs) {
    try {
      results[slug] = await syncTenantSheet(prisma, slug);
    } catch (err) {
      anyFailed = true;
      console.error(`Sheet sync failed for tenant "${slug}":`, err);
      results[slug] = { error: err instanceof Error ? err.message : "Unknown error" };
    }
  }

  return NextResponse.json({ ok: !anyFailed, results }, { status: anyFailed ? 500 : 200 });
}
