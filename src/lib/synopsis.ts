import PDFDocument from "pdfkit";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUS_LABELS } from "@/lib/enums";
import type { ScoreBreakdownEntry } from "@/lib/scoring/types";

const BRAND_ORANGE = "#ea580c";
const SLATE_900 = "#0f172a";
const SLATE_500 = "#64748b";
const SLATE_200 = "#e2e8f0";

export async function getSynopsisData(applicationId: string) {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
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
  });
  return application;
}

type SynopsisApplication = NonNullable<Awaited<ReturnType<typeof getSynopsisData>>>;

function fmtDate(d: Date | null | undefined) {
  return d ? new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(d) : "—";
}

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

// Builds one candidate's synopsis PDF and resolves with the full buffer.
// `embedImages` fetches each document from Google Drive and shows the
// actual photo/scan inline instead of a link — only safe to enable for a
// single-application download (a handful of extra network fetches). The
// bulk ZIP (hundreds of applications) always leaves it off, since fetching
// a document per application there would turn a pure-database, ~10s job
// into thousands of external requests.
export async function renderSynopsisPdf(application: SynopsisApplication, options?: { embedImages?: boolean }): Promise<Buffer> {
  const embedImages = options?.embedImages ?? false;

  const documentImages = new Map<string, Buffer>();
  if (embedImages) {
    await Promise.all(
      application.documents.map(async (d) => {
        if (!d.externalUrl) return;
        const fileId = extractDriveFileId(d.externalUrl);
        if (!fileId) return;
        try {
          const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
          if (!res.ok) return;
          const contentType = res.headers.get("content-type") ?? "";
          if (!contentType.startsWith("image/")) return; // pdfkit only embeds raster images, not PDFs
          documentImages.set(d.id, Buffer.from(await res.arrayBuffer()));
        } catch {
          // Fall back to a link for this one document.
        }
      }),
    );
  }

  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // --- Header -----------------------------------------------------
    doc.fillColor(SLATE_500).fontSize(9).text(application.tenant.name.toUpperCase(), { characterSpacing: 0.5 });
    doc.fillColor(SLATE_900).fontSize(18).font("Helvetica-Bold").text("Application Synopsis", { paragraphGap: 2 });
    doc
      .fillColor(SLATE_500)
      .fontSize(9)
      .font("Helvetica")
      .text(`${application.applicationNumber}  ·  Generated ${fmtDate(new Date())}`);
    doc.moveDown(0.6);
    doc.strokeColor(BRAND_ORANGE).lineWidth(2).moveTo(doc.x, doc.y).lineTo(doc.x + pageWidth, doc.y).stroke();
    doc.moveDown(1);

    const status = APPLICATION_STATUS_LABELS[application.status as keyof typeof APPLICATION_STATUS_LABELS] ?? application.status;
    const score = application.scores[0];
    const finalScore = score?.overrideScore ?? score?.calculatedScore;

    sectionHeader(doc, "Candidate Details");
    twoColRow(doc, pageWidth, [
      ["Full Name", application.candidate.fullName],
      ["Email", application.candidate.email],
      ["Mobile", application.candidate.mobile ?? "—"],
      ["Date of Birth", fmtDate(application.candidate.dateOfBirth)],
      ["Gender", application.candidate.gender ?? "—"],
      ["Status", status],
    ]);

    sectionHeader(doc, "Application Details");
    twoColRow(doc, pageWidth, [
      ["Job", application.job.title],
      ["Department", application.job.department?.name ?? "—"],
      ["Applied On", fmtDate(application.submittedAt)],
      ["Score", finalScore !== undefined ? `${finalScore} / ${score?.calculatedMaxScore ?? "?"}` : "Not calculated"],
    ]);

    if (score) {
      const breakdown: ScoreBreakdownEntry[] = JSON.parse(score.calculatedBreakdownJson);
      if (breakdown.length) {
        sectionHeader(doc, "Score Breakdown");
        for (const b of breakdown) {
          rowLine(doc, pageWidth, `${b.name}${b.detail ? ` — ${b.detail}` : ""}`, `${b.points} / ${b.maxPoints}`);
        }
      }
    }

    if (application.job.form) {
      for (const section of application.job.form.sections) {
        const values = section.fields
          .map((f) => {
            const v = application.fieldValues.find((fv) => fv.fieldId === f.id);
            const text = v?.valueText || (v?.valueNumber !== null && v?.valueNumber !== undefined ? String(v.valueNumber) : "");
            return text ? ([f.label, text] as [string, string]) : null;
          })
          .filter((x): x is [string, string] => x !== null);
        if (values.length === 0) continue;
        sectionHeader(doc, section.name);
        // Single-column, not two-column: these values (packed "Label:Value,..."
        // cells from the original Sheet) are often long enough to wrap several
        // lines, and pairing two of them side by side means the whole pair
        // must fit together — one long neighbor strands a short one, and
        // whichever pair doesn't fit gets pushed whole to a fresh page,
        // leaving a large blank gap behind. One column lets each field
        // paginate independently.
        singleColRows(doc, pageWidth, values);
      }
    }

    sectionHeader(doc, `Documents (${application.documents.length})`);
    if (application.documents.length === 0) {
      doc.fillColor(SLATE_500).fontSize(9).font("Helvetica-Oblique").text("No documents uploaded.");
      doc.moveDown(0.5);
    } else {
      for (const d of application.documents) {
        const image = documentImages.get(d.id);
        if (image) {
          embedDocumentImage(doc, pageWidth, d.documentType, image, d.verified);
        } else {
          rowLine(doc, pageWidth, `${d.documentType}${d.verified ? "  (Verified)" : ""}`, d.externalUrl ?? "—", d.verified);
        }
      }
    }

    doc.end();
  });
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
  doc.moveDown(0.6);
  doc.fillColor(BRAND_ORANGE).fontSize(11).font("Helvetica-Bold").text(title.toUpperCase(), { characterSpacing: 0.3 });
  doc.moveDown(0.3);
}

// pdfkit's `doc.x`/`doc.y` cursor can drift after an explicit-coordinate
// `.text()` call, so every helper below anchors to the page's left margin
// directly rather than re-reading `doc.x` — otherwise a second column
// silently inherits a shifted x from the first and renders off the page.
function twoColRow(doc: PDFKit.PDFDocument, pageWidth: number, pairs: [string, string][]) {
  const leftX = doc.page.margins.left;
  const colWidth = pageWidth / 2 - 10;
  for (let i = 0; i < pairs.length; i += 2) {
    const left = pairs[i];
    const right = pairs[i + 1];
    const projectedHeight = rowHeight(doc, left[1], colWidth, right?.[1]);
    if (doc.y + projectedHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    writeField(doc, left[0], left[1], leftX, y, colWidth);
    if (right) writeField(doc, right[0], right[1], leftX + colWidth + 20, y, colWidth);
    doc.x = leftX;
    doc.y = y + rowHeight(doc, left[1], colWidth, right?.[1]);
  }
  doc.moveDown(0.4);
}

function singleColRows(doc: PDFKit.PDFDocument, pageWidth: number, pairs: [string, string][]) {
  const leftX = doc.page.margins.left;
  for (const [label, value] of pairs) {
    const height = doc.heightOfString(value, { width: pageWidth }) + 14;
    if (doc.y + height > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    writeField(doc, label, value, leftX, y, pageWidth);
    doc.x = leftX;
    doc.y = y + height;
  }
  doc.moveDown(0.4);
}

function rowHeight(doc: PDFKit.PDFDocument, leftVal: string, colWidth: number, rightVal?: string) {
  const h1 = doc.heightOfString(leftVal, { width: colWidth });
  const h2 = rightVal ? doc.heightOfString(rightVal, { width: colWidth }) : 0;
  return Math.max(h1, h2, 12) + 14;
}

function writeField(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  doc.fillColor(SLATE_500).fontSize(7.5).font("Helvetica").text(label.toUpperCase(), x, y, { width, characterSpacing: 0.2 });
  doc.fillColor(SLATE_900).fontSize(9.5).font("Helvetica").text(value, x, y + 11, { width });
}

function rowLine(doc: PDFKit.PDFDocument, pageWidth: number, left: string, right: string, verified?: boolean) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 24) doc.addPage();
  const leftX = doc.page.margins.left;
  const y = doc.y;
  doc.fillColor(SLATE_900).fontSize(9).font("Helvetica").text(left, leftX, y, { width: pageWidth * 0.55 });
  doc
    .fillColor(verified ? "#059669" : SLATE_500)
    .fontSize(8)
    .text(right, leftX + pageWidth * 0.55, y, { width: pageWidth * 0.45, align: "right" });
  doc.x = leftX;
  doc.moveDown(0.5);
  doc.strokeColor(SLATE_200).lineWidth(0.5).moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).stroke();
  doc.moveDown(0.4);
}

function embedDocumentImage(doc: PDFKit.PDFDocument, pageWidth: number, label: string, image: Buffer, verified?: boolean) {
  const maxHeight = 220;
  const leftX = doc.page.margins.left;
  // Reserve the label row plus the image's max possible height; pdfkit's
  // `fit` option scales down to whichever bound (width or height) is
  // tighter, so this is a safe upper bound for the page-break check.
  if (doc.y + 20 + maxHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();

  doc.fillColor(SLATE_900).fontSize(9).font("Helvetica-Bold").text(label, leftX, doc.y, { width: pageWidth * 0.7, continued: false });
  if (verified) {
    doc.fillColor("#059669").fontSize(8).font("Helvetica").text("Verified", leftX + pageWidth * 0.7, doc.y - 11, { width: pageWidth * 0.3, align: "right" });
  }
  doc.x = leftX;
  doc.moveDown(0.3);

  const imageY = doc.y;
  doc.image(image, leftX, imageY, { fit: [pageWidth * 0.5, maxHeight] });
  doc.x = leftX;
  doc.y = imageY + maxHeight + 10;
  doc.strokeColor(SLATE_200).lineWidth(0.5).moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).stroke();
  doc.moveDown(0.4);
}
