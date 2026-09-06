import { NextRequest, NextResponse } from "next/server";
import { getSynopsisData, renderSynopsisPdf } from "@/lib/synopsis";

export const maxDuration = 60;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const application = await getSynopsisData(applicationId);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // embedDocuments is an opt-in, per-tenant admin setting (off by
  // default) — merges every other uploaded document (certificates, ID
  // proofs, ...) onto the end of the PDF too when the tenant has turned
  // it on. Safe to allow a generous cap here even for tenants who have:
  // unlike the bulk ZIP, one application's worth of documents is a
  // handful of extra fetches, not hundreds.
  const pdf = await renderSynopsisPdf(application, {
    embedImages: true,
    embedDocuments: application.tenant.synopsisEmbedDocuments,
    maxDocuments: 20,
  });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="synopsis-${application.applicationNumber}.pdf"`,
    },
  });
}
