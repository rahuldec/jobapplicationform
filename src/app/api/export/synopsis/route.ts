import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { renderSynopsisPdf } from "@/lib/synopsis";
import { APPLICATION_STATUSES } from "@/lib/enums";

export const maxDuration = 60;

// A specific `ids` selection (the Applications page's multi-select
// checkboxes) embeds real document images/PDFs into each report, same as
// the single-application download — each one now fetches every document
// from Google Drive, so unlike the plain filtered export below, this
// can't scale to the full dataset. Measured well within budget up to
// this count; beyond it, ask the user to narrow their selection instead
// of risking a timeout partway through the ZIP.
const MAX_EMBEDDED_IDS = 30;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

// Bulk-generates one synopsis PDF per application — either a specific
// `ids` selection (embeds real documents, capped — see above) or
// everything matching the current Applications page filters (same logic
// as the Excel export; link-only, no document fetches, so it comfortably
// handles the full dataset within the function time limit) — and streams
// them back as a single ZIP.
export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant();
  const params = request.nextUrl.searchParams;

  // A specific selection from the Applications page's multi-select checkboxes
  // takes priority over the filter fields below (which drive the "download
  // everything matching the current filters" flow instead).
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (ids.length > MAX_EMBEDDED_IDS) {
    return NextResponse.json(
      {
        error: `${ids.length} applications selected, which is too many for one download (limit ${MAX_EMBEDDED_IDS}) — each one's documents are fetched individually. Select fewer and try again.`,
      },
      { status: 400 },
    );
  }

  const q = params.get("q") ?? "";
  const jobId = params.get("jobId") ?? "";
  const isToday = params.get("since") === "today";
  const statusList = (params.get("status") ?? "")
    .split(",")
    .filter((s): s is (typeof APPLICATION_STATUSES)[number] => APPLICATION_STATUSES.includes(s as never));
  const hasStatus = statusList.length > 0;

  const where = {
    tenantId: tenant.id,
    ...(ids.length > 0
      ? { id: { in: ids } }
      : {
          status: hasStatus ? { in: statusList } : undefined,
          jobId: jobId || undefined,
          ...(isToday ? (hasStatus ? { updatedAt: { gte: startOfToday() } } : { createdAt: { gte: startOfToday() } }) : {}),
          ...(q
            ? {
                OR: [
                  { applicationNumber: { contains: q } },
                  { candidate: { fullName: { contains: q } } },
                  { candidate: { email: { contains: q } } },
                  { candidate: { mobile: { contains: q } } },
                ],
              }
            : {}),
        }),
  };

  const applications = await prisma.application.findMany({
    where,
    include: {
      tenant: true,
      candidate: true,
      job: {
        include: {
          department: true,
          form: { include: { sections: { include: { fields: true }, orderBy: { order: "asc" } } } },
          scoringPattern: { include: { versions: { where: { status: "published" } } } },
        },
      },
      fieldValues: { include: { field: true } },
      documents: { orderBy: { uploadedAt: "asc" } },
      scores: { orderBy: { calculatedAt: "desc" }, take: 1 },
    },
    orderBy: { createdAt: "desc" },
  });

  if (applications.length === 0) {
    return NextResponse.json({ error: "No applications match the current filters." }, { status: 404 });
  }

  const passthrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err) => passthrough.destroy(err));
  archive.pipe(passthrough);

  const embedImages = ids.length > 0;

  (async () => {
    const usedNames = new Set<string>();
    for (const app of applications) {
      const pdf = await renderSynopsisPdf(app, { embedImages });
      let name = `${app.applicationNumber} - ${app.candidate.fullName}.pdf`.replace(/[/\\?%*:|"<>]/g, "-");
      while (usedNames.has(name)) name = `${name.replace(/\.pdf$/, "")}-dup.pdf`;
      usedNames.add(name);
      archive.append(pdf, { name });
    }
    await archive.finalize();
  })().catch((err) => {
    console.error("Bulk synopsis generation failed:", err);
    passthrough.destroy(err instanceof Error ? err : new Error(String(err)));
  });

  const datePart = new Date().toISOString().slice(0, 10);
  return new NextResponse(Readable.toWeb(passthrough) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="synopsis-reports-${datePart}.zip"`,
    },
  });
}
