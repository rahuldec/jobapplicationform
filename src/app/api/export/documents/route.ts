import { NextRequest, NextResponse } from "next/server";
import { ZipArchive } from "archiver";
import { PassThrough, Readable } from "node:stream";
import { prisma } from "@/lib/prisma";
import { getCurrentTenant } from "@/lib/tenant";
import { APPLICATION_STATUSES } from "@/lib/enums";

export const maxDuration = 60;

// Fetching real file bytes from Google Drive for every matching document
// is nothing like the synopsis ZIP (which only reads already-loaded
// Postgres data) — each file is a separate external network request, so
// a truly "bulk" run across the whole dataset (hundreds to low thousands
// of documents) cannot reliably finish inside Vercel's function time
// limit. Cap it and tell the caller to narrow their filters instead of
// silently timing out partway through a huge ZIP.
const MAX_DOCUMENTS = 150;
const CONCURRENCY = 8;

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

async function runWithConcurrency<T>(items: T[], limit: number, worker: (item: T, index: number) => Promise<void>) {
  let next = 0;
  async function runner() {
    while (next < items.length) {
      const i = next++;
      await worker(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, runner));
}

export async function GET(request: NextRequest) {
  const tenant = await getCurrentTenant();
  const params = request.nextUrl.searchParams;

  const q = params.get("q") ?? "";
  const jobId = params.get("jobId") ?? "";
  const isToday = params.get("since") === "today";
  const groupBy = params.get("groupBy") === "type" ? "type" : "candidate";
  const statusList = (params.get("status") ?? "")
    .split(",")
    .filter((s): s is (typeof APPLICATION_STATUSES)[number] => APPLICATION_STATUSES.includes(s as never));
  const hasStatus = statusList.length > 0;

  const where = {
    tenantId: tenant.id,
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
  };

  const applications = await prisma.application.findMany({
    where,
    include: { candidate: true, documents: true },
    orderBy: { createdAt: "desc" },
  });

  if (applications.length === 0) {
    return NextResponse.json({ error: "No applications match the current filters." }, { status: 404 });
  }

  const entries = applications.flatMap((app) =>
    app.documents
      .filter((d) => d.externalUrl)
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
    return NextResponse.json(
      {
        error: `${entries.length} documents match the current filters, which is too many for one download (limit ${MAX_DOCUMENTS}) — each file has to be fetched individually from Google Drive. Narrow the filters (by job, status, or search) and try again with a smaller set.`,
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
