import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { isTenantAuthenticated } from "@/lib/tenant-auth";
import { renderSynopsisPdf } from "@/lib/synopsis";
import { APPLICATION_STATUSES } from "@/lib/enums";
import { runWithConcurrency } from "@/lib/concurrency";
import { startOfTodayIST } from "@/lib/date";

export const maxDuration = 300;

// A specific `ids` selection (the Applications page's multi-select
// checkboxes) embeds each candidate's Photograph/Signature into their
// report, same as the single-application download.
//
// Measured directly (a real 268-candidate tenant, images-only, no other
// documents embedded): concurrency 6 finished in 86s, concurrency 10 in
// 50s, concurrency 16 in 31s, concurrency 24 in 22s — all with zero
// failures, run from a clean local network. That last part matters: this
// project's *other* bulk-export route (export/documents) measured real
// Google Drive contention on Vercel's own infrastructure once concurrency
// passed ~12-16 (24 was slower than 16, which was slower than 12) — a
// clean local network won't show that. This route also does real CPU work
// per candidate (PDFKit rendering) that competes for the same limited
// serverless CPU share, on top of the fetches. 6 is chosen as a
// deliberately conservative middle ground given that prior finding, not
// the fastest number my own measurement showed — retune with a real
// Vercel measurement (see git history of export/documents/route.ts for
// how that was done) if bulk runs are slower than expected in practice.
//
// Merging every OTHER document (embedDocuments, a separate per-tenant
// toggle) onto each candidate's PDF is real additional per-candidate work
// this measurement didn't cover, so that path keeps the original,
// unbenchmarked-but-safe cap.
const MAX_EMBEDDED_IDS_IMAGES_ONLY = 400;
const MAX_EMBEDDED_IDS_WITH_DOCUMENTS = 25;
const CANDIDATE_CONCURRENCY = 6;
const MAX_DOCUMENTS_PER_CANDIDATE = 5;

// Bulk-generates one synopsis PDF per application — either a specific
// `ids` selection (embeds real documents, capped — see above) or
// everything matching the current Applications page filters (same logic
// as the Excel export; link-only, no document fetches, so it comfortably
// handles the full dataset within the function time limit) — and streams
// them back as a single ZIP.
export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant();
  if (!(await isTenantAuthenticated(tenant.id))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const params = request.nextUrl.searchParams;

  // A specific selection from the Applications page's multi-select checkboxes
  // takes priority over the filter fields below (which drive the "download
  // everything matching the current filters" flow instead).
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  // "Download every application matching the current filters, with
  // Photograph/Signature embedded" — the self-serve alternative to
  // manually checkbox-selecting a page at a time. Only meaningful without
  // an explicit `ids` selection, which already always embeds images.
  const wantsAllWithImages = ids.length === 0 && params.get("images") === "true";

  const maxEmbeddedIds = tenant.synopsisEmbedDocuments ? MAX_EMBEDDED_IDS_WITH_DOCUMENTS : MAX_EMBEDDED_IDS_IMAGES_ONLY;
  if (ids.length > maxEmbeddedIds) {
    return NextResponse.json(
      {
        error: `${ids.length} applications selected, which is too many for one download (limit ${maxEmbeddedIds}) — each one's documents are fetched individually. Select fewer and try again.`,
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
          ...(isToday ? (hasStatus ? { updatedAt: { gte: startOfTodayIST() } } : { createdAt: { gte: startOfTodayIST() } }) : {}),
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
        },
      },
      fieldValues: { include: { field: true } },
      documents: { orderBy: { uploadedAt: "asc" } },
    },
    orderBy: { createdAt: "desc" },
  });

  if (applications.length === 0) {
    return NextResponse.json({ error: "No applications match the current filters." }, { status: 404 });
  }
  if (wantsAllWithImages && applications.length > maxEmbeddedIds) {
    return NextResponse.json(
      {
        error: `${applications.length} applications match the current filters, which is too many for one download with photos (limit ${maxEmbeddedIds}) — each one's Photograph/Signature is fetched individually. Narrow the filters (by job, status, or search) and try again, or download without photos instead.`,
      },
      { status: 400 },
    );
  }

  const passthrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err) => passthrough.destroy(err));
  archive.pipe(passthrough);

  const embedImages = ids.length > 0 || wantsAllWithImages;

  (async () => {
    const usedNames = new Set<string>();
    const addToArchive = (app: (typeof applications)[number], pdf: Buffer) => {
      let name = `${app.applicationNumber} - ${app.candidate.fullName}.pdf`.replace(/[/\\?%*:|"<>]/g, "-");
      while (usedNames.has(name)) name = `${name.replace(/\.pdf$/, "")}-dup.pdf`;
      usedNames.add(name);
      archive.append(pdf, { name });
    };

    if (embedImages) {
      // Each candidate's own documents already fetch in parallel inside
      // renderSynopsisPdf — this adds a second layer of concurrency
      // across candidates, so several PDFs are being built (and their
      // documents fetched from Drive) at the same time instead of one
      // candidate finishing before the next starts.
      await runWithConcurrency(applications, CANDIDATE_CONCURRENCY, async (app) => {
        const pdf = await renderSynopsisPdf(app, {
          embedImages,
          embedDocuments: app.tenant.synopsisEmbedDocuments,
          maxDocuments: MAX_DOCUMENTS_PER_CANDIDATE,
        });
        addToArchive(app, pdf);
      });
    } else {
      for (const app of applications) {
        const pdf = await renderSynopsisPdf(app, { embedImages });
        addToArchive(app, pdf);
      }
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
