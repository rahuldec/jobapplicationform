// All candidates/tenants are in India, but this app runs on Vercel's
// serverless functions, whose default runtime timezone is UTC — not IST.
// Intl.DateTimeFormat("en-IN", ...) alone only affects locale conventions
// (date ordering, etc), not the actual timezone conversion, so every date
// display must pass `timeZone` explicitly or it silently renders UTC wall
// time with Indian formatting. Centralized here so that can't drift.
const TIME_ZONE = "Asia/Kolkata";

export function formatDate(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeZone: TIME_ZONE }).format(d);
}

export function formatDateTime(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "medium", timeStyle: "short", timeZone: TIME_ZONE }).format(d);
}

export function formatDateTimeFull(d: Date): string {
  return new Intl.DateTimeFormat("en-IN", { dateStyle: "full", timeStyle: "short", timeZone: TIME_ZONE }).format(d);
}

const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;

// Midnight IST for "today", as an absolute instant — used to scope every
// "today" filter (dashboard tiles, Applications' "today" link, exports).
// `new Date(); d.setHours(0,0,0,0)` would give midnight in the *server's*
// timezone, which on Vercel is UTC — 5.5 hours off from what "today" means
// to anyone using this app. Deriving the IST calendar date via
// formatToParts (locale-agnostic, reads by `type`) keeps this correct no
// matter what timezone the process itself runs in.
export function startOfTodayIST(): Date {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const year = Number(parts.find((p) => p.type === "year")!.value);
  const month = Number(parts.find((p) => p.type === "month")!.value);
  const day = Number(parts.find((p) => p.type === "day")!.value);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0) - IST_OFFSET_MS);
}
