import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { looksLikeReferenceText } from "@/lib/synopsis-template-validation";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, template } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    // Defense in depth: the client already blocks this, but a real
    // incident (the reference panel's own text got pasted and saved as
    // the template, producing a synopsis PDF that was just the
    // documentation with its {{tokens}} substituted) showed it's worth
    // guarding here too rather than trusting the client exclusively.
    if (typeof template === "string" && looksLikeReferenceText(template)) {
      return NextResponse.json(
        { error: "This looks like the reference panel's text, not an HTML template." },
        { status: 400 }
      );
    }

    await prisma.tenant.update({
      where: { id: tenantId },
      data: { synopsisTemplateHtml: template || null },
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Failed to save template:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }
}
