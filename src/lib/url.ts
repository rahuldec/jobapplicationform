// Absolute URL to this app itself — needed anywhere a link/image has to
// resolve outside the browser that's currently rendering a page (an
// email client, most immediately). VERCEL_PROJECT_PRODUCTION_URL is the
// project's real assigned domain (jobportal.odpay.in in production);
// VERCEL_URL is set on every deployment (including previews) but points
// at that specific deployment's own throwaway URL, so it's only the
// fallback. Neither is set locally, hence the localhost fallback.
export function getAppBaseUrl(): string {
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`;
  if (process.env.VERCEL_URL) return `https://${process.env.VERCEL_URL}`;
  return "http://localhost:3000";
}
