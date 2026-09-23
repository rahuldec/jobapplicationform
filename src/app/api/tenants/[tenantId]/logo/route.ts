import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getTenantBranding, logoDataUrlToBuffer } from "@/lib/branding";

// Serves a tenant's logo as a real image response instead of the
// data:...;base64 URI it's stored as (used inline elsewhere in the app,
// e.g. the nav header and login screen — fine there since the browser is
// already rendering the page's own HTML/CSS). Email clients are a
// different story: many strip or fail to render base64-embedded <img>
// src attributes entirely, so an email needing a logo (the interview
// email's header) needs a real, fetchable URL — this route is that URL.
// Public/unauthenticated on purpose: a tenant's logo already appears on
// their own public application form and login page.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ tenantId: string }> }) {
  const { tenantId } = await params;
  const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
  if (!tenant) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const branding = getTenantBranding(tenant);
  if (!branding.logoDataUrl) return NextResponse.json({ error: "No logo set for this tenant" }, { status: 404 });

  const buf = logoDataUrlToBuffer(branding.logoDataUrl);
  if (!buf) return NextResponse.json({ error: "Logo data is malformed" }, { status: 500 });

  const mimeMatch = branding.logoDataUrl.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,/);
  const contentType = mimeMatch?.[1] ?? "image/png";

  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      // A logo change should show up reasonably promptly rather than
      // being cached indefinitely by an intermediary/email client, but
      // doesn't need re-fetching on every single open either.
      "Cache-Control": "public, max-age=3600",
    },
  });
}
