import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { TENANT_COOKIE } from "@/lib/tenant";

// Per-client entry link, e.g. /dn — sets this browser's active tenant
// (getCurrentTenant() reads the same cookie) and drops into the normal app
// shell. Only matches single-segment paths that aren't one of the app's
// own top-level routes (dashboard, jobs, applications, apply, api,
// settings), since Next resolves those literal folders first.
export async function GET(request: NextRequest, { params }: { params: Promise<{ tenantSlug: string }> }) {
  const { tenantSlug } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { slug: tenantSlug } });

  const response = NextResponse.redirect(new URL("/dashboard", request.url));
  if (tenant) {
    response.cookies.set(TENANT_COOKIE, tenant.id, {
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
      httpOnly: false,
    });
  }
  return response;
}
