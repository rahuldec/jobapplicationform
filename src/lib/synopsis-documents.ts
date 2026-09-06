import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

interface DocumentLike {
  documentType: string;
  externalUrl: string | null;
  fileName: string | null;
}

// Merging real document files onto every synopsis used to be the default
// behavior here and was rewritten away (see /api/export/synopsis's
// history) because fetching + merging every document for every candidate
// in a bulk run caused real timeouts. Re-enabling it (per explicit
// request, including for bulk paths) keeps that risk — callers pass a
// cap appropriate to their context (a single download can afford more
// than a 100-candidate bulk ZIP) rather than this module enforcing one
// number for every situation.
const DEFAULT_MAX_DOCUMENTS_PER_APPLICATION = 10;

const A4_WIDTH = 595.28;
const A4_HEIGHT = 841.89;
const PAGE_MARGIN = 40;

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

function looksLikePdf(contentType: string, fileName: string | null): boolean {
  return contentType.includes("pdf") || !!fileName?.toLowerCase().endsWith(".pdf");
}

function looksLikeJpeg(contentType: string, fileName: string | null): boolean {
  return contentType.includes("jpeg") || contentType.includes("jpg") || !!fileName?.toLowerCase().match(/\.jpe?g$/);
}

function looksLikePng(contentType: string, fileName: string | null): boolean {
  return contentType.includes("png") || !!fileName?.toLowerCase().endsWith(".png");
}

async function fetchDriveFile(url: string): Promise<{ bytes: Buffer; contentType: string; fileName: string | null } | null> {
  const fileId = extractDriveFileId(url);
  if (!fileId) return null;
  try {
    const res = await fetch(`https://drive.google.com/uc?export=download&id=${fileId}`);
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer());
    const contentType = res.headers.get("content-type") ?? "";
    const disposition = res.headers.get("content-disposition") ?? "";
    const filenameMatch = disposition.match(/filename="?([^";]+)"?/);
    return { bytes, contentType, fileName: filenameMatch ? filenameMatch[1] : null };
  } catch {
    return null;
  }
}

// Draws one image (JPEG/PNG only — pdf-lib doesn't decode other raster
// formats without an extra conversion step) onto its own new page, scaled
// to fit within the page margins and labeled with the document's type so
// it's identifiable once merged in among the candidate's other documents.
async function appendImagePage(pdfDoc: PDFDocument, bytes: Buffer, label: string, isJpeg: boolean) {
  const image = isJpeg ? await pdfDoc.embedJpg(bytes) : await pdfDoc.embedPng(bytes);
  const page = pdfDoc.addPage([A4_WIDTH, A4_HEIGHT]);
  const font = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText(label.toUpperCase(), {
    x: PAGE_MARGIN,
    y: A4_HEIGHT - PAGE_MARGIN,
    size: 11,
    font,
    color: rgb(0.15, 0.15, 0.15),
  });

  const availableWidth = A4_WIDTH - PAGE_MARGIN * 2;
  const availableHeight = A4_HEIGHT - PAGE_MARGIN * 2 - 30; // leave room for the label
  const scale = Math.min(availableWidth / image.width, availableHeight / image.height, 1);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;

  page.drawImage(image, {
    x: PAGE_MARGIN + (availableWidth - drawWidth) / 2,
    y: PAGE_MARGIN,
    width: drawWidth,
    height: drawHeight,
  });
}

async function appendPdfPages(pdfDoc: PDFDocument, bytes: Buffer) {
  const sourceDoc = await PDFDocument.load(bytes, { ignoreEncryption: true });
  const pages = await pdfDoc.copyPages(sourceDoc, sourceDoc.getPageIndices());
  for (const page of pages) pdfDoc.addPage(page);
}

// Appends a candidate's uploaded documents (Aadhar, certificates, etc. —
// anything that isn't the Photograph/Signature already embedded in the
// header/declaration) onto the end of an already-rendered synopsis PDF.
// Images become their own labeled page; real PDFs have their pages
// copied in directly. Anything else (Word docs, unrecognized formats)
// is silently skipped — pdf-lib can only place what it can decode.
export async function appendDocumentsToPdf(
  basePdf: Buffer,
  documents: DocumentLike[],
  options?: { maxDocuments?: number }
): Promise<Buffer> {
  const candidates = documents
    .filter((d) => d.externalUrl && !/photo/i.test(d.documentType) && !/signature/i.test(d.documentType))
    .slice(0, options?.maxDocuments ?? DEFAULT_MAX_DOCUMENTS_PER_APPLICATION);

  if (candidates.length === 0) return basePdf;

  const fetched = await Promise.all(candidates.map((d) => fetchDriveFile(d.externalUrl!)));

  const pdfDoc = await PDFDocument.load(basePdf);

  for (let i = 0; i < candidates.length; i++) {
    const file = fetched[i];
    if (!file) continue;
    const { bytes, contentType, fileName } = file;
    try {
      if (looksLikePdf(contentType, fileName)) {
        await appendPdfPages(pdfDoc, bytes);
      } else if (looksLikeJpeg(contentType, fileName)) {
        await appendImagePage(pdfDoc, bytes, candidates[i].documentType, true);
      } else if (looksLikePng(contentType, fileName)) {
        await appendImagePage(pdfDoc, bytes, candidates[i].documentType, false);
      }
      // Any other format can't be placed into the PDF — skipped.
    } catch {
      // A single corrupt/unreadable document shouldn't fail the whole
      // synopsis — skip it and keep going.
    }
  }

  const finalBytes = await pdfDoc.save();
  return Buffer.from(finalBytes);
}
