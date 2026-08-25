import PDFDocument from "pdfkit";
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

// Some single-answer fields were exported from the Sheet as
// "Yes/No:NO" — the literal question-type stem baked into the answer,
// with the real value after the colon. There's only one pair here (no
// comma), so parseCompoundValue skips it and it would otherwise render
// as the raw "Yes/No:NO" string. Strip the stem when it reads like a
// short label rather than genuine data (a time, a ratio, a URL) that
// just happens to contain a colon.
function stripAnswerPrefix(raw: string): string {
  if (raw.includes(",")) return raw;
  const idx = raw.indexOf(":");
  if (idx === -1) return raw;
  const prefix = raw.slice(0, idx).trim();
  const rest = raw.slice(idx + 1).trim();
  if (!rest || !/^[A-Za-z][A-Za-z/'" ]{0,24}$/.test(prefix)) return raw;
  return rest;
}

// Builds one candidate's synopsis PDF and resolves with the full buffer.
// This is the clean report — candidate details, education, employment,
// etc. — with just the candidate's photo in the page-1 header and their
// signature in a closing declaration block. It does NOT list or embed
// the candidate's other uploaded documents; that's what the "Docs"
// download (bulk document ZIP) is for. `embedImages` fetches only the
// Photograph/Signature documents from Google Drive — two small images,
// not the full document set — so it's cheap enough to leave on for both
// the single-application download and a multi-select ZIP.
export async function renderSynopsisPdf(application: SynopsisApplication, options?: { embedImages?: boolean }): Promise<Buffer> {
  const embedImages = options?.embedImages ?? false;

  let photoImage: Buffer | null = null;
  let signatureImage: Buffer | null = null;
  if (embedImages) {
    const photoDoc = application.documents.find((d) => /photo/i.test(d.documentType));
    const signatureDoc = application.documents.find((d) => /signature/i.test(d.documentType));
    await Promise.all([
      (async () => {
        if (!photoDoc?.externalUrl) return;
        const fileId = extractDriveFileId(photoDoc.externalUrl);
        if (!fileId) return;
        try {
          const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
          if (!res.ok) return;
          const contentType = res.headers.get("content-type") ?? "";
          const buf = Buffer.from(await res.arrayBuffer());
          if (contentType.startsWith("image/")) photoImage = buf;
        } catch {
          // Falls back to no photo in the header.
        }
      })(),
      (async () => {
        if (!signatureDoc?.externalUrl) return;
        const fileId = extractDriveFileId(signatureDoc.externalUrl);
        if (!fileId) return;
        try {
          const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
          if (!res.ok) return;
          const contentType = res.headers.get("content-type") ?? "";
          const buf = Buffer.from(await res.arrayBuffer());
          if (contentType.startsWith("image/")) signatureImage = buf;
        } catch {
          // Falls back to no signature block.
        }
      })(),
    ]);
  }

  return new Promise<Buffer>((resolve, reject) => {
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

    // A framed photo in the top-right corner of page 1 — the same "photo
    // ID card" placement as the paper application form this replaces.
    const photoBoxWidth = 58;
    const photoBoxHeight = 72;
    const photoBoxX = leftX + pageWidth - photoBoxWidth;
    if (photoImage) {
      doc.roundedRect(photoBoxX, headerTop, photoBoxWidth, photoBoxHeight, 4).lineWidth(1).stroke(SLATE_200);
      doc.image(photoImage, photoBoxX + 3, headerTop + 3, {
        fit: [photoBoxWidth - 6, photoBoxHeight - 6],
        align: "center",
        valign: "center",
      });
      doc.strokeColor(BRAND_ORANGE).lineWidth(2).moveTo(photoBoxX, headerTop + photoBoxHeight + 4).lineTo(photoBoxX + photoBoxWidth, headerTop + photoBoxHeight + 4).stroke();
    }

    const textX = leftX + logoWidth + 12;
    const textWidth = pageWidth - logoWidth - 12 - (photoImage ? photoBoxWidth + 12 : 0);
    doc
      .fillColor(SLATE_900)
      .fontSize(14)
      .font("Helvetica-Bold")
      .text(application.tenant.name.toUpperCase(), textX, headerTop, { width: textWidth, characterSpacing: 0.3 });
    doc.fillColor(SLATE_500).fontSize(9).font("Helvetica").text("Application Synopsis", textX, doc.y + 3, { width: textWidth });

    doc.x = leftX;
    doc.y = Math.max(headerTop + logoHeight, headerTop + (photoImage ? photoBoxHeight + 6 : 0), doc.y) + 10;
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

        // Sections flow naturally one after another (sectionHeader/gridRows/
        // compoundCard each break to a new page only when the content
        // itself won't fit) — forcing specific sections to always start
        // fresh reliably left blank gaps whenever the preceding section
        // was short or only slightly overflowed onto a new page.

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
          else simple.push([label, stripAnswerPrefix(value)]);
        }

        sectionHeader(doc, section.name);
        if (simple.length) gridRows(doc, pageWidth, simple);
        for (const c of compound) compoundCard(doc, pageWidth, c.label, c.pairs);
      }
    }

    if (signatureImage) {
      sectionHeader(doc, "Declaration");
      doc
        .fillColor(SLATE_500)
        .fontSize(8)
        .font("Helvetica")
        .text("I hereby declare that the information given above is true to the best of my knowledge.", leftX, doc.y, { width: pageWidth });
      doc.moveDown(1);

      const sigWidth = 170;
      const sigHeight = 56;
      if (doc.y + sigHeight + 28 > doc.page.height - doc.page.margins.bottom) doc.addPage();
      const sigY = doc.y;
      doc.roundedRect(leftX, sigY, sigWidth, sigHeight, 4).lineWidth(1).stroke(SLATE_200);
      doc.image(signatureImage, leftX + 4, sigY + 4, { fit: [sigWidth - 8, sigHeight - 8], align: "center", valign: "center" });
      doc.strokeColor(SLATE_200).lineWidth(0.5).moveTo(leftX, sigY + sigHeight + 4).lineTo(leftX + sigWidth, sigY + sigHeight + 4).stroke();
      doc.fillColor(SLATE_900).fontSize(9).font("Helvetica-Bold").text(application.candidate.fullName, leftX, sigY + sigHeight + 8, { width: sigWidth });
      doc.fillColor(SLATE_500).fontSize(7.5).font("Helvetica").text("Candidate Signature", leftX, doc.y, { width: sigWidth, characterSpacing: 0.2 });
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
