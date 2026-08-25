import PDFDocument from "pdfkit";
import { PDFDocument as PDFLibDocument } from "pdf-lib";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUS_LABELS } from "@/lib/enums";
import type { ScoreBreakdownEntry } from "@/lib/scoring/types";
import { NBGSM_LOGO } from "@/lib/nbgsm-logo";

// Natural pixel dimensions of the embedded logo (235 x 300) — used to
// scale it to a fixed header height while keeping its aspect ratio.
const LOGO_ASPECT = 235 / 300;

const BRAND_ORANGE = "#ea580c";
const SLATE_900 = "#0f172a";
const SLATE_500 = "#64748b";
const SLATE_200 = "#e2e8f0";
const CARD_BG = "#f8fafc";

// These dynamic form sections each start on a fresh page rather than
// wherever they happen to fall — keeps the report's overall shape
// (candidate summary, then qualifications, then experience, then
// research) consistent across candidates regardless of how much content
// precedes them.
const FORCE_NEW_PAGE_SECTIONS = new Set(["Educational Qualifications", "Teaching Experience", "Research & Co-Curricular"]);

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

// The original Sheet packed some cells into one delimited string, e.g.
// "Roll No.:75436,Year of Passing:2001,Division:Second,...". Splits it
// back into labelled sub-fields — only where a comma is immediately
// followed by another "Label:", so a value that itself contains commas
// (a subject list) stays intact. Same logic as the web app's version.
function parseCompoundValue(raw: string): { label: string; value: string }[] | null {
  if (!raw.includes(":") || !raw.includes(",")) return null;
  const parts = raw.split(/,(?=[A-Za-z][^,:]{0,40}:)/);
  const pairs: { label: string; value: string }[] = [];
  for (const part of parts) {
    const idx = part.indexOf(":");
    if (idx === -1) return null;
    const label = part.slice(0, idx).trim();
    if (!label) return null;
    pairs.push({ label, value: part.slice(idx + 1).trim() });
  }
  return pairs.length >= 2 ? pairs : null;
}

// Builds one candidate's synopsis PDF and resolves with the full buffer.
// `embedImages` fetches each document from Google Drive: image documents
// (photo, signature, scanned certificates) render inline; genuine PDF
// documents (score sheets, publication PDFs) get their real pages merged
// onto the end of the report via pdf-lib, since pdfkit itself can only
// draw fresh content, not import pages from an existing PDF. Only safe to
// enable for a single-application download — the bulk ZIP leaves it off,
// since fetching every document for hundreds of applications would turn a
// pure-database ~10s job into thousands of external requests.
export async function renderSynopsisPdf(application: SynopsisApplication, options?: { embedImages?: boolean }): Promise<Buffer> {
  const embedImages = options?.embedImages ?? false;

  const documentImages = new Map<string, Buffer>();
  const documentPdfs = new Map<string, Buffer>();
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
          const buf = Buffer.from(await res.arrayBuffer());
          if (contentType.startsWith("image/")) documentImages.set(d.id, buf);
          // Google's direct-download endpoint serves PDFs as generic
          // application/octet-stream, not application/pdf — the header is
          // unreliable here, so check the file's actual magic bytes.
          else if (buf.subarray(0, 5).toString("latin1") === "%PDF-") documentPdfs.set(d.id, buf);
        } catch {
          // Falls back to a plain link for this one document.
        }
      }),
    );
  }

  const mainBuffer = await new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 44 });
    const chunks: Buffer[] = [];
    doc.on("data", (chunk) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;

    // --- Header -----------------------------------------------------
    const leftX = doc.page.margins.left;
    const headerTop = doc.y;
    const logoHeight = 48;
    const logoWidth = logoHeight * LOGO_ASPECT;
    doc.image(NBGSM_LOGO, leftX, headerTop, { height: logoHeight });

    const textX = leftX + logoWidth + 12;
    const textWidth = pageWidth - logoWidth - 12;
    doc
      .fillColor(SLATE_900)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(application.tenant.name.toUpperCase(), textX, headerTop, { width: textWidth, characterSpacing: 0.3 });
    doc.fillColor(SLATE_500).fontSize(9).font("Helvetica").text("Application Synopsis", textX, doc.y + 3, { width: textWidth });

    doc.x = leftX;
    doc.y = Math.max(headerTop + logoHeight, doc.y) + 10;
    doc
      .fillColor(SLATE_500)
      .fontSize(9)
      .font("Helvetica")
      .text(`${application.applicationNumber}  ·  Generated ${fmtDate(new Date())}`, leftX, doc.y, { width: pageWidth });
    doc.moveDown(0.6);
    doc.strokeColor(BRAND_ORANGE).lineWidth(2).moveTo(leftX, doc.y).lineTo(leftX + pageWidth, doc.y).stroke();
    doc.moveDown(1);

    const status = APPLICATION_STATUS_LABELS[application.status as keyof typeof APPLICATION_STATUS_LABELS] ?? application.status;
    const score = application.scores[0];
    const finalScore = score?.overrideScore ?? score?.calculatedScore;

    sectionHeader(doc, "Candidate Details");
    gridRows(doc, pageWidth, [
      ["Full Name", application.candidate.fullName],
      ["Email", application.candidate.email],
      ["Mobile", application.candidate.mobile ?? "—"],
      ["Date of Birth", fmtDate(application.candidate.dateOfBirth)],
      ["Gender", application.candidate.gender ?? "—"],
      ["Status", status],
    ]);

    sectionHeader(doc, "Application Details");
    gridRows(doc, pageWidth, [
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
        const rawValues = section.fields
          .map((f) => {
            const v = application.fieldValues.find((fv) => fv.fieldId === f.id);
            const text = v?.valueText || (v?.valueNumber !== null && v?.valueNumber !== undefined ? String(v.valueNumber) : "");
            return text ? { label: f.label, value: text } : null;
          })
          .filter((x): x is { label: string; value: string } => x !== null);
        if (rawValues.length === 0) continue;

        if (FORCE_NEW_PAGE_SECTIONS.has(section.name) && doc.y > doc.page.margins.top) doc.addPage();

        // Split each section into short, simple fields (a compact grid)
        // and packed "Label:Value,..." fields (their own card, broken back
        // into labelled sub-fields) instead of forcing every field into
        // one layout — a bare "Yes"/"Na" and a 7-part qualification record
        // don't read well side by side.
        const simple: [string, string][] = [];
        const compound: { label: string; pairs: { label: string; value: string }[] }[] = [];
        for (const { label, value } of rawValues) {
          const parsed = parseCompoundValue(value);
          if (parsed) compound.push({ label, pairs: parsed });
          else simple.push([label, value]);
        }

        sectionHeader(doc, section.name);
        if (simple.length) gridRows(doc, pageWidth, simple);
        for (const c of compound) compoundCard(doc, pageWidth, c.label, c.pairs);
      }
    }

    sectionHeader(doc, `Documents (${application.documents.length})`);
    if (application.documents.length === 0) {
      doc.fillColor(SLATE_500).fontSize(9).font("Helvetica-Oblique").text("No documents uploaded.");
      doc.moveDown(0.5);
    } else {
      // Signature and Photograph are small identity images that each left
      // half the row empty when stacked full-width one after another —
      // pair them into a single row when both are present as images.
      const signatureDoc = application.documents.find((d) => documentImages.has(d.id) && /signature/i.test(d.documentType));
      const photoDoc = application.documents.find((d) => documentImages.has(d.id) && /photo/i.test(d.documentType));
      if (signatureDoc && photoDoc) {
        embedImagePair(
          doc,
          pageWidth,
          { label: signatureDoc.documentType, image: documentImages.get(signatureDoc.id)!, verified: signatureDoc.verified },
          { label: photoDoc.documentType, image: documentImages.get(photoDoc.id)!, verified: photoDoc.verified },
        );
      }
      for (const d of application.documents) {
        if (d.id === signatureDoc?.id || d.id === photoDoc?.id) continue;
        const image = documentImages.get(d.id);
        if (image) {
          embedDocumentImage(doc, pageWidth, d.documentType, image, d.verified);
        } else if (documentPdfs.has(d.id)) {
          rowLine(doc, pageWidth, `${d.documentType}${d.verified ? "  (Verified)" : ""}`, "Attached as pages below", d.verified);
        } else {
          rowLine(doc, pageWidth, `${d.documentType}${d.verified ? "  (Verified)" : ""}`, d.externalUrl ?? "—", d.verified);
        }
      }
    }

    doc.end();
  });

  if (documentPdfs.size === 0) return mainBuffer;

  // Merge each real PDF document's actual pages onto the end of the
  // report — pdfkit can't import pages from an existing PDF, so this
  // second pass uses pdf-lib, which can. No divider/title page in
  // between: the Documents section already lists each one, in the same
  // order they're appended here, as "Attached as pages below".
  const merged = await PDFLibDocument.load(mainBuffer);

  for (const d of application.documents) {
    const pdfBytes = documentPdfs.get(d.id);
    if (!pdfBytes) continue;
    try {
      const src = await PDFLibDocument.load(pdfBytes, { ignoreEncryption: true });
      const copiedPages = await merged.copyPages(src, src.getPageIndices());
      copiedPages.forEach((p) => merged.addPage(p));
    } catch {
      // A malformed/unreadable source PDF shouldn't take down the whole
      // report — just skip it silently.
    }
  }

  return Buffer.from(await merged.save());
}

function sectionHeader(doc: PDFKit.PDFDocument, title: string) {
  if (doc.y > doc.page.height - doc.page.margins.bottom - 60) doc.addPage();
  doc.moveDown(0.6);
  doc.fillColor(BRAND_ORANGE).fontSize(11).font("Helvetica-Bold").text(title.toUpperCase(), { characterSpacing: 0.3 });
  doc.moveDown(0.3);
}

// A label can wrap to two lines (e.g. "Permanent Address Same As
// Present?"), so the space reserved for a field must depend on the
// label's own height, not just the value's — otherwise the value gets
// drawn at a fixed offset and collides with the label's second line.
function measureField(doc: PDFKit.PDFDocument, label: string, value: string, width: number, labelSize: number, valueSize: number) {
  doc.fontSize(labelSize).font("Helvetica");
  const labelHeight = doc.heightOfString(label.toUpperCase(), { width, characterSpacing: 0.2 });
  doc.fontSize(valueSize).font("Helvetica");
  const valueHeight = doc.heightOfString(value || "—", { width });
  return { labelHeight, total: labelHeight + 2 + valueHeight };
}

// pdfkit's `doc.x`/`doc.y` cursor can drift after an explicit-coordinate
// `.text()` call, so every helper below anchors to the page's left margin
// directly rather than re-reading `doc.x` — otherwise a later column
// silently inherits a shifted x from an earlier one and renders off the
// page.
function gridRows(doc: PDFKit.PDFDocument, pageWidth: number, pairs: [string, string][], cols = 3) {
  const leftX = doc.page.margins.left;
  const gap = 16;
  const colWidth = (pageWidth - gap * (cols - 1)) / cols;
  for (let i = 0; i < pairs.length; i += cols) {
    const rowItems = pairs.slice(i, i + cols);
    const rowH = Math.max(...rowItems.map(([label, v]) => measureField(doc, label, v, colWidth, 7.5, 9.5).total), 12) + 8;
    if (doc.y + rowH > doc.page.height - doc.page.margins.bottom) doc.addPage();
    const y = doc.y;
    rowItems.forEach(([label, value], idx) => {
      writeField(doc, label, value, leftX + idx * (colWidth + gap), y, colWidth);
    });
    doc.x = leftX;
    doc.y = y + rowH;
  }
  doc.moveDown(0.4);
}

// Renders one packed field (e.g. "Matriculation") as a titled, tinted
// card containing its parsed sub-fields in a small 3-column grid — much
// easier to scan than the original "Roll No.:X,Year of Passing:Y,..."
// as one dense run-on line.
function compoundCard(doc: PDFKit.PDFDocument, pageWidth: number, title: string, pairs: { label: string; value: string }[]) {
  const leftX = doc.page.margins.left;
  const padding = 10;
  const innerWidth = pageWidth - padding * 2;
  const cols = 3;
  const gap = 12;
  const colWidth = (innerWidth - gap * (cols - 1)) / cols;

  const rows: { label: string; value: string }[][] = [];
  for (let i = 0; i < pairs.length; i += cols) rows.push(pairs.slice(i, i + cols));
  const rowHeights = rows.map(
    (row) => Math.max(...row.map((p) => measureField(doc, p.label, p.value, colWidth, 6.5, 8.5).total), 10) + 6,
  );
  const headerHeight = 18;
  const totalHeight = padding * 2 + headerHeight + rowHeights.reduce((a, b) => a + b, 0);

  if (doc.y + totalHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();
  const cardY = doc.y;

  doc.roundedRect(leftX, cardY, pageWidth, totalHeight, 4).fillAndStroke(CARD_BG, SLATE_200);
  doc.fillColor(SLATE_900).fontSize(9.5).font("Helvetica-Bold").text(title, leftX + padding, cardY + padding, { width: innerWidth });

  let rowY = cardY + padding + headerHeight;
  for (let r = 0; r < rows.length; r++) {
    rows[r].forEach((p, idx) => {
      const x = leftX + padding + idx * (colWidth + gap);
      const labelHeight = measureField(doc, p.label, p.value, colWidth, 6.5, 8.5).labelHeight;
      doc.fillColor(SLATE_500).fontSize(6.5).font("Helvetica").text(p.label.toUpperCase(), x, rowY, { width: colWidth, characterSpacing: 0.2 });
      doc.fillColor(SLATE_900).fontSize(8.5).font("Helvetica").text(p.value || "—", x, rowY + labelHeight + 2, { width: colWidth });
    });
    rowY += rowHeights[r];
  }

  doc.x = leftX;
  doc.y = cardY + totalHeight + 8;
}

function writeField(doc: PDFKit.PDFDocument, label: string, value: string, x: number, y: number, width: number) {
  const labelHeight = measureField(doc, label, value, width, 7.5, 9.5).labelHeight;
  doc.fillColor(SLATE_500).fontSize(7.5).font("Helvetica").text(label.toUpperCase(), x, y, { width, characterSpacing: 0.2 });
  doc.fillColor(SLATE_900).fontSize(9.5).font("Helvetica").text(value, x, y + labelHeight + 2, { width });
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

function embedImagePair(
  doc: PDFKit.PDFDocument,
  pageWidth: number,
  left: { label: string; image: Buffer; verified?: boolean },
  right: { label: string; image: Buffer; verified?: boolean },
) {
  const maxHeight = 160;
  const leftX = doc.page.margins.left;
  const gap = 16;
  const colWidth = (pageWidth - gap) / 2;
  if (doc.y + 20 + maxHeight > doc.page.height - doc.page.margins.bottom) doc.addPage();

  const labelY = doc.y;
  [left, right].forEach((item, idx) => {
    const x = leftX + idx * (colWidth + gap);
    doc.fillColor(SLATE_900).fontSize(9).font("Helvetica-Bold").text(item.label, x, labelY, { width: colWidth * 0.6, continued: false });
    if (item.verified) {
      doc.fillColor("#059669").fontSize(8).font("Helvetica").text("Verified", x, labelY, { width: colWidth, align: "right" });
    }
  });
  doc.x = leftX;
  doc.y = labelY + 14;

  const imageY = doc.y;
  doc.image(left.image, leftX, imageY, { fit: [colWidth, maxHeight] });
  doc.image(right.image, leftX + colWidth + gap, imageY, { fit: [colWidth, maxHeight] });
  doc.x = leftX;
  doc.y = imageY + maxHeight + 10;
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
