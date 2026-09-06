import { NextRequest, NextResponse } from "next/server";
import { getSynopsisData, renderSynopsisPdf } from "@/lib/synopsis";

export const maxDuration = 60;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const application = await getSynopsisData(applicationId);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  // Safe here (unlike the bulk ZIP): one application's worth of documents
  // is a handful of extra fetches, not hundreds. embedDocuments merges
  // every other uploaded document (certificates, ID proofs, ...) onto the
  // end of the PDF too — images as their own page, real PDFs with their
  // pages copied in directly.
  const pdf = await renderSynopsisPdf(application, { embedImages: true, embedDocuments: true, maxDocuments: 20 });

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="synopsis-${application.applicationNumber}.pdf"`,
    },
  });
}
