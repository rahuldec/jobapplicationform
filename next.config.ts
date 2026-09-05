import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @sparticuz/chromium resolves its bundled Chromium binary via a path
  // relative to its own location on disk (__dirname + "bin"). Bundling or
  // relocating its code breaks that lookup — Vercel then reports the "bin"
  // directory missing, even though the underlying files exist in
  // node_modules. Marking it external forces Next to `require()` it in
  // place at runtime instead.
  serverExternalPackages: ["@sparticuz/chromium", "puppeteer-core"],

  // serverExternalPackages alone wasn't enough: Vercel's Output File
  // Tracing still wasn't copying @sparticuz/chromium's non-JS binary
  // assets (its bin/ directory) into the deployed function, so the file
  // genuinely didn't exist at runtime even though the JS wasn't bundled.
  // Force-include it explicitly — this is Next's own documented pattern
  // for exactly this class of native/runtime asset package.
  outputFileTracingIncludes: {
    "/*": ["node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
