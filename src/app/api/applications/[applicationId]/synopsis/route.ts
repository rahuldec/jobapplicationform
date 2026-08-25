import { NextRequest, NextResponse } from "next/server";
import { getSynopsisData, renderSynopsisPdf } from "@/lib/synopsis";

export const maxDuration = 30;

export async function GET(_request: NextRequest, { params }: { params: Promise<{ applicationId: string }> }) {
  const { applicationId } = await params;
  const application = await getSynopsisData(applicationId);
  if (!application) {
    return NextResponse.json({ error: "Application not found" }, { status: 404 });
  }

  const pdf = await renderSynopsisPdf(application);

  return new NextResponse(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="synopsis-${application.applicationNumber}.pdf"`,
    },
  });
}
