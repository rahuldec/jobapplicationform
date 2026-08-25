import { describe, expect, it } from "vitest";
import { getImageDimensions, getTenantBranding, logoDataUrlToBuffer } from "./branding";

describe("getTenantBranding", () => {
  it("falls back to tenant.name and default gradient when brandingJson is null", () => {
    const branding = getTenantBranding({ name: "Some College", brandingJson: null });
    expect(branding.name).toBe("Some College");
    expect(branding.shortName).toBe("Some College");
    expect(branding.logoDataUrl).toBeNull();
    expect(branding.gradient).toEqual({ from: "#0f2359", via: "#1b449c", to: "#3465c9" });
  });

  it("uses the parsed branding when present", () => {
    const branding = getTenantBranding({
      name: "Some College",
      brandingJson: JSON.stringify({
        name: "Custom Name",
        shortName: "CN",
        logoDataUrl: "data:image/png;base64,AAAA",
        gradient: { from: "#111111", via: "#222222", to: "#333333" },
      }),
    });
    expect(branding.name).toBe("Custom Name");
    expect(branding.shortName).toBe("CN");
    expect(branding.logoDataUrl).toBe("data:image/png;base64,AAAA");
    expect(branding.gradient).toEqual({ from: "#111111", via: "#222222", to: "#333333" });
  });

  it("degrades gracefully instead of throwing on malformed JSON", () => {
    const branding = getTenantBranding({ name: "Some College", brandingJson: "{not valid json" });
    expect(branding.name).toBe("Some College");
    expect(branding.gradient).toEqual({ from: "#0f2359", via: "#1b449c", to: "#3465c9" });
  });

  it("falls back per-field when brandingJson is partial", () => {
    const branding = getTenantBranding({
      name: "Some College",
      brandingJson: JSON.stringify({ name: "Custom Name" }),
    });
    expect(branding.name).toBe("Custom Name");
    expect(branding.shortName).toBe("Some College");
    expect(branding.logoDataUrl).toBeNull();
  });
});

describe("logoDataUrlToBuffer", () => {
  it("decodes a valid base64 data URI", () => {
    const original = Buffer.from("hello world");
    const dataUrl = `data:image/png;base64,${original.toString("base64")}`;
    const buf = logoDataUrlToBuffer(dataUrl);
    expect(buf?.toString()).toBe("hello world");
  });

  it("returns null for a malformed data URI", () => {
    expect(logoDataUrlToBuffer("not-a-data-url")).toBeNull();
  });
});

describe("getImageDimensions", () => {
  it("reads width/height from a PNG's IHDR chunk", () => {
    const buf = Buffer.alloc(24);
    buf.writeUInt32BE(0x89504e47, 0);
    buf.writeUInt32BE(0x0d0a1a0a, 4);
    buf.writeUInt32BE(300, 16); // width
    buf.writeUInt32BE(235, 20); // height
    expect(getImageDimensions(buf)).toEqual({ width: 300, height: 235 });
  });

  it("reads width/height from a JPEG SOF0 segment", () => {
    const buf = Buffer.alloc(12);
    buf.writeUInt16BE(0xffd8, 0); // SOI
    buf[2] = 0xff;
    buf[3] = 0xc0; // SOF0 marker
    buf.writeUInt16BE(0x11, 4); // segment length (unused by the parser)
    buf[6] = 0x08; // precision byte
    buf.writeUInt16BE(100, 7); // height
    buf.writeUInt16BE(200, 9); // width
    expect(getImageDimensions(buf)).toEqual({ width: 200, height: 100 });
  });

  it("returns null for a buffer that's neither PNG nor JPEG", () => {
    expect(getImageDimensions(Buffer.from("not an image"))).toBeNull();
  });

  it("returns null for a truncated buffer", () => {
    expect(getImageDimensions(Buffer.alloc(2))).toBeNull();
  });
});
