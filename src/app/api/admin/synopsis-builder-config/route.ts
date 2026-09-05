import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { SynopsisBuilderConfig } from "@/lib/synopsis-builder-types";
import { configToHtml } from "@/lib/synopsis-builder-html";

export async function POST(req: NextRequest) {
  try {
    const { tenantId, config } = await req.json();

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    // Validate config structure
    if (!config || typeof config !== "object" || !Array.isArray(config.blocks)) {
      return NextResponse.json({ error: "Invalid config structure" }, { status: 400 });
    }

    // Generate HTML from config
    let generatedHtml: string | null = null;
    try {
      generatedHtml = configToHtml(config);
    } catch (err) {
      console.warn("Failed to generate HTML from config:", err);
      // Don't fail the save if HTML generation fails, just skip it
    }

    // Store config as JSON string
    // Also store generated HTML as the template, so it can be used for PDF rendering
    await prisma.tenant.update({
      where: { id: tenantId },
      data: {
        synopsisTemplateBuilderConfig: JSON.stringify(config),
        // Store generated HTML as template for rendering
        // This way the rendering pipeline stays simple
        synopsisTemplateHtml: generatedHtml,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Config saved and HTML generated",
      htmlGenerated: !!generatedHtml,
    });
  } catch (err) {
    console.error("Failed to save builder config:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to save" },
      { status: 500 }
    );
  }
}

export async function GET(req: NextRequest) {
  try {
    const tenantId = req.nextUrl.searchParams.get("tenantId");

    if (!tenantId) {
      return NextResponse.json({ error: "tenantId required" }, { status: 400 });
    }

    const tenant = await prisma.tenant.findUnique({
      where: { id: tenantId },
      select: { synopsisTemplateBuilderConfig: true },
    });

    if (!tenant) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 404 });
    }

    const config: SynopsisBuilderConfig | null = tenant.synopsisTemplateBuilderConfig
      ? JSON.parse(tenant.synopsisTemplateBuilderConfig)
      : null;

    return NextResponse.json({ config });
  } catch (err) {
    console.error("Failed to fetch builder config:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to fetch" },
      { status: 500 }
    );
  }
}
