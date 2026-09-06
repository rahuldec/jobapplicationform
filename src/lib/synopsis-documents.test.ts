import { describe, it, expect, vi, afterEach } from "vitest";
import { PDFDocument } from "pdf-lib";
import { appendDocumentsToPdf } from "./synopsis-documents";

// A valid 1x1 transparent PNG, the smallest fixture that actually
// round-trips through pdf-lib's embedPng.
const ONE_PX_PNG_BASE64 =
  "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

async function makeBasePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

async function makeFixturePdf(pageCount: number): Promise<Buffer> {
  const doc = await PDFDocument.create();
  for (let i = 0; i < pageCount; i++) doc.addPage([200, 200]);
  return Buffer.from(await doc.save());
}

function mockFetchResponses(responses: Record<string, { bytes: Buffer; contentType: string }>) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string) => {
      const match = url.match(/id=([^&]+)/);
      const id = match?.[1];
      const entry = id ? responses[id] : undefined;
      if (!entry) return { ok: false } as Response;
      return {
        ok: true,
        headers: new Headers({ "content-type": entry.contentType }),
        arrayBuffer: async () => entry.bytes.buffer.slice(entry.bytes.byteOffset, entry.bytes.byteOffset + entry.bytes.byteLength),
      } as unknown as Response;
    })
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("appendDocumentsToPdf", () => {
  it("returns the base PDF unchanged when there are no documents", async () => {
    const base = await makeBasePdf();
    const result = await appendDocumentsToPdf(base, []);
    expect(result).toEqual(base);
  });

  it("skips Photograph and Signature documents (already embedded elsewhere)", async () => {
    const base = await makeBasePdf();
    const result = await appendDocumentsToPdf(base, [
      { documentType: "Photograph", externalUrl: "https://drive.google.com/file/d/photo123/view", fileName: "photo.jpg" },
      { documentType: "Signature", externalUrl: "https://drive.google.com/file/d/sig123/view", fileName: "sig.jpg" },
    ]);
    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(1); // unchanged from base
  });

  it("merges a real PDF document's pages onto the end", async () => {
    const base = await makeBasePdf();
    const fixturePdf = await makeFixturePdf(3);
    mockFetchResponses({
      cert123: { bytes: fixturePdf, contentType: "application/pdf" },
    });

    const result = await appendDocumentsToPdf(base, [
      { documentType: "Degree Certificate", externalUrl: "https://drive.google.com/file/d/cert123/view", fileName: "degree.pdf" },
    ]);

    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(4); // 1 base + 3 merged
  });

  it("embeds an image document as its own new page", async () => {
    const base = await makeBasePdf();
    const pngBytes = Buffer.from(ONE_PX_PNG_BASE64, "base64");
    mockFetchResponses({
      idcard123: { bytes: pngBytes, contentType: "image/png" },
    });

    const result = await appendDocumentsToPdf(base, [
      { documentType: "Aadhar Card", externalUrl: "https://drive.google.com/file/d/idcard123/view", fileName: "aadhar.png" },
    ]);

    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(2); // 1 base + 1 image page
  });

  it("skips a document whose fetch fails without throwing", async () => {
    const base = await makeBasePdf();
    mockFetchResponses({}); // nothing resolves — simulates a 404/network failure

    const result = await appendDocumentsToPdf(base, [
      { documentType: "Missing Doc", externalUrl: "https://drive.google.com/file/d/gone123/view", fileName: "gone.pdf" },
    ]);

    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(1); // unchanged — the failed fetch was skipped
  });

  it("caps the number of documents merged per application", async () => {
    const base = await makeBasePdf();
    const pngBytes = Buffer.from(ONE_PX_PNG_BASE64, "base64");
    const responses: Record<string, { bytes: Buffer; contentType: string }> = {};
    const documents = Array.from({ length: 5 }, (_, i) => {
      responses[`doc${i}`] = { bytes: pngBytes, contentType: "image/png" };
      return { documentType: `Doc ${i}`, externalUrl: `https://drive.google.com/file/d/doc${i}/view`, fileName: `doc${i}.png` };
    });
    mockFetchResponses(responses);

    const result = await appendDocumentsToPdf(base, documents, { maxDocuments: 2 });
    const resultDoc = await PDFDocument.load(result);
    expect(resultDoc.getPageCount()).toBe(3); // 1 base + only 2 of the 5 merged
  });
});
