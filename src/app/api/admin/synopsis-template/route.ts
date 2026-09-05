import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, template } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
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
