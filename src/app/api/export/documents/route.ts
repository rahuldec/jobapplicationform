import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { APPLICATION_STATUSES } from "@/lib/enums";
import { runWithConcurrency } from "@/lib/concurrency";

export const maxDuration = 60;

// Fetching real file bytes from Google Drive for every matching document
// is nothing like the synopsis ZIP (which only reads already-loaded
// Postgres data) — each file is a separate external network request, so
// a truly "bulk" run across the whole dataset cannot reliably finish
// inside Vercel's function time limit for every shape of request. Cap it
// and tell the caller to narrow their filters instead of silently timing
// out partway through a huge ZIP.
// Measured against the real production deployment for the heaviest
// realistic case — one document type (e.g. "Graduation — Certificate",
// real multi-hundred-KB PDFs) across the full 348-application dataset:
// concurrency 24 caused Drive-side contention and got slower (71s) than
// concurrency 16 (49.7s); concurrency 12 was fastest and most consistent
// at 43.7s, leaving real margin under the 60s hard limit. 400 covers the
// full dataset with headroom for growth.
const MAX_DOCUMENTS = 400;
const CONCURRENCY = 12;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function safeName(s: string) {
  return s.replace(/[/\\?%*:|"<>]/g, "-").trim();
}

export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant();
  const params = request.nextUrl.searchParams;

  // A specific selection from the Applications page's multi-select
  // checkboxes takes priority over the filter fields below, same as the
  // synopsis export.
  const ids = (params.get("ids") ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const q = params.get("q") ?? "";
  const jobId = params.get("jobId") ?? "";
  const documentType = params.get("documentType") ?? "";
  const isToday = params.get("since") === "today";
  const groupBy = params.get("groupBy") === "type" ? "type" : "candidate";
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
    include: { candidate: true, documents: true },
    orderBy: { createdAt: "desc" },
  });

  if (applications.length === 0) {
    return NextResponse.json({ error: ids.length > 0 ? "No matching applications found." : "No applications match the current filters." }, { status: 404 });
  }

  const entries = applications.flatMap((app) =>
    app.documents
      .filter((d) => d.externalUrl && (!documentType || d.documentType === documentType))
      .map((d) => ({
        url: d.externalUrl!,
        candidateName: app.candidate.fullName,
        applicationNumber: app.applicationNumber,
        documentType: d.documentType,
      })),
  );

  if (entries.length === 0) {
    return NextResponse.json({ error: "No documents on any matching application." }, { status: 404 });
  }
  if (entries.length > MAX_DOCUMENTS) {
    const narrow = ids.length > 0 ? "Select fewer applications" : "Narrow the filters (by job, status, or search)";
    return NextResponse.json(
      {
        error: `${entries.length} documents match this request, which is too many for one download (limit ${MAX_DOCUMENTS}) — each file has to be fetched individually from Google Drive. ${narrow} and try again with a smaller set.`,
      },
      { status: 400 },
    );
  }

  const passthrough = new PassThrough();
  const archive = new ZipArchive({ zlib: { level: 6 } });
  archive.on("error", (err) => passthrough.destroy(err));
  archive.pipe(passthrough);

  (async () => {
    const usedNames = new Set<string>();
    await runWithConcurrency(entries, CONCURRENCY, async (entry) => {
      const fileId = extractDriveFileId(entry.url);
      if (!fileId) return;
      try {
        const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
        if (!res.ok) return;
        const buf = Buffer.from(await res.arrayBuffer());

        const disposition = res.headers.get("content-disposition") ?? "";
        const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
        const ext = filenameMatch ? filenameMatch[1].split(".").pop() : (res.headers.get("content-type")?.split("/")[1] ?? "bin");

        const folder = groupBy === "type" ? safeName(entry.documentType) : `${safeName(entry.candidateName)} - ${entry.applicationNumber}`;
        const file = groupBy === "type" ? `${safeName(entry.candidateName)} - ${entry.applicationNumber}` : safeName(entry.documentType);

        let name = `${folder}/${file}.${ext}`;
        while (usedNames.has(name)) name = `${folder}/${file}-dup.${ext}`;
        usedNames.add(name);
        archive.append(buf, { name });
      } catch {
        // Skip files that fail to fetch rather than failing the whole ZIP.
      }
    });
    await archive.finalize();
  })().catch((err) => {
    console.error("Bulk document export failed:", err);
    passthrough.destroy(err instanceof Error ? err : new Error(String(err)));
  });

  const datePart = new Date().toISOString().slice(0, 10);
  return new NextResponse(Readable.toWeb(passthrough) as ReadableStream, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="documents-${groupBy}-${datePart}.zip"`,
    },
  });
}
