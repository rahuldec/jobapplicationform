// Reads Tenant.brandingJson into a typed, defaulted shape — every caller
// (web header, synopsis PDF) goes through this instead of touching the
// raw JSON, so a malformed or missing config degrades gracefully instead
// of breaking the page.
export type TenantBranding = {
  name: string;
  shortName: string;
  // One line shown under the name in the nav header, e.g. "Excellence in
  // Education Since 1956" — purely decorative, optional, admin-set.
  tagline: string | null;
  // A `data:image/...;base64,...` URI — logos are stored inline rather
  // than in separate file storage, since a client's logo is a few tens
  // of KB and Postgres already holds every other piece of tenant config
  // (brandingJson itself, the Sheet import mapping). Revisit if a client
  // ever needs a genuinely large image.
  logoDataUrl: string | null;
  gradient: { from: string; via: string; to: string };
};

const DEFAULT_GRADIENT = { from: "#0f2359", via: "#1b449c", to: "#3465c9" };

export function getTenantBranding(tenant: { name: string; brandingJson: string | null }): TenantBranding {
  let parsed: Partial<TenantBranding> = {};
  if (tenant.brandingJson) {
    try {
      parsed = JSON.parse(tenant.brandingJson);
    } catch {
      // Malformed branding config shouldn't break the page — fall back to defaults.
    }
  }
  return {
    name: parsed.name || tenant.name,
    shortName: parsed.shortName || tenant.name,
    tagline: parsed.tagline || null,
    logoDataUrl: parsed.logoDataUrl ?? null,
    gradient: parsed.gradient ?? DEFAULT_GRADIENT,
  };
}

// synopsis.ts needs the logo as raw bytes for pdfkit, not a data URI.
export function logoDataUrlToBuffer(logoDataUrl: string): Buffer | null {
  const match = logoDataUrl.match(/^data:image\/[a-zA-Z0-9.+-]+;base64,(.+)$/);
  if (!match) return null;
  return Buffer.from(match[1], "base64");
}

// Every tenant's logo has its own natural aspect ratio, needed to lay out
// the header before pdfkit draws the image — pdfkit's own dimension
// reader (doc.openImage) isn't part of its public types, so this reads
// the two formats a logo upload will realistically be in directly from
// the file header rather than relying on an undocumented internal API.
export function getImageDimensions(buf: Buffer): { width: number; height: number } | null {
  // PNG: signature, then IHDR chunk with width/height as big-endian u32 at fixed offsets.
  if (buf.length >= 24 && buf.readUInt32BE(0) === 0x89504e47 && buf.readUInt32BE(4) === 0x0d0a1a0a) {
    return { width: buf.readUInt32BE(16), height: buf.readUInt32BE(20) };
  }
  // JPEG: scan markers for the first Start-Of-Frame segment (SOF0/SOF2 are
  // by far the most common); height/width are big-endian u16 right after
  // the segment's precision byte.
  if (buf.length >= 4 && buf.readUInt16BE(0) === 0xffd8) {
    let offset = 2;
    while (offset + 9 < buf.length) {
      if (buf[offset] !== 0xff) break;
      const marker = buf[offset + 1];
      const segmentLength = buf.readUInt16BE(offset + 2);
      const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
      if (isSOF) {
        return { height: buf.readUInt16BE(offset + 5), width: buf.readUInt16BE(offset + 7) };
      }
      offset += 2 + segmentLength;
    }
  }
  return null;
}
