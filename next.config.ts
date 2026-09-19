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
  //
  // Scoped to just the 3 routes that actually render a synopsis PDF
  // (src/lib/synopsis-render.ts's Puppeteer path) — this was originally
  // "/*" (every route), which bundled the ~66MB chromium binary into
  // all 23 routes in the app on every deployment. Next's own docs
  // explicitly warn against that ("avoid **/* at the repo root... keep
  // patterns as narrow as possible") — it was the reason Vercel's
  // Functions Storage usage climbed to the Hobby plan's 10GB limit.
  outputFileTracingIncludes: {
    "/api/applications/\\[applicationId\\]/synopsis": ["node_modules/@sparticuz/chromium/**/*"],
    "/api/export/synopsis": ["node_modules/@sparticuz/chromium/**/*"],
    "/api/export/documents": ["node_modules/@sparticuz/chromium/**/*"],
  },
};

export default nextConfig;
