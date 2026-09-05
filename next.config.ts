import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium resolves its bundled Chromium binary via a path
  // relative to its own location on disk (__dirname + "bin"). Bundling or
  // relocating its code breaks that lookup — Vercel then reports the "bin"
  // directory missing, even though the underlying files exist in
  // node_modules. Marking it external forces Next to `require()` it in
  // place at runtime instead.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],
};

export default nextConfig;
