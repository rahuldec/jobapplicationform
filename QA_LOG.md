# QA Log — Recruitment Ops Portal

Running record of issues found and fixed during development/testing, and features added along the way. Most recent first within each section.

## Deployment & infrastructure bugs

- **GitHub push didn't auto-trigger a Vercel deployment** (twice) — the webhook silently missed the push; fixed by manually running `vercel --prod`. Worth watching for after future pushes rather than assuming it fired.
- **Postgres connection pool leak** — `src/lib/prisma.ts` created a brand-new `pg.Pool()` on every dev hot-reload instead of reusing one, eventually exhausting the database's (very low) connection limit and taking the live site down. Fixed by caching the pool alongside the Prisma client in the dev-only global, and capping `max` connections everywhere a pool is created.
- **Vercel project's Framework Preset was set to "Other"** instead of "Next.js" — builds succeeded but every route 404'd at runtime because Vercel served the output as a generic static site. Fixed with an explicit `"framework": "nextjs"` in `vercel.json`.
- **Missing `postinstall` script** — Vercel doesn't run `prisma generate` automatically; build failed with a module-not-found error until added.
- **`prisma.config.ts` crashed at build time** — Vercel only injects "Sensitive" env vars (our `DATABASE_URL`) at runtime, not during the build step, but the config used a strict helper that threw if the var was unresolved. `prisma generate` doesn't actually need a live connection, so this was a false failure; fixed with a fallback placeholder URL at config-load time.

## Data integrity issues

- **Accidentally deleted 16 legitimate duplicate applications** before confirming intent — some candidates resubmitted the same job's form more than once (real Google Forms behavior, e.g. "Amit Kumar" submitted 3 times). Restored by re-running the sync against the live Sheet; no permanent data loss, but a reminder to confirm before deduplicating anything.
- **Original one-off import script wasn't safe to re-run** — would have duplicated every job/application on a second run. Redesigned as an incremental, append-only sync (see Sheet sync section below).
- **Sync's "how much has already been imported" query was broken** on first attempt (a `$queryRaw` tagged-template regex issue returned 0 instead of 348) — caught in testing before it could recreate/duplicate any real rows; fixed by switching to a parameterized `$queryRawUnsafe` call.
- **Leftover demo data** required two cleanup passes: first pass removed the demo tenant/jobs/form/scoring pattern/applications; a second pass was needed for two demo staff users ("Renu Sharma", "Vikram Rao") and a stale audit-log entry that the first pass missed.

## UI bugs found and fixed

- **Tenant switcher showed a stale selection** after switching tenants — React's `defaultValue` on an uncontrolled `<select>` only applies on mount, so it could visually disagree with the actual data on screen. Fixed by keying the element on the current tenant id to force a remount. (Component was later removed entirely per a subsequent request to drop the switcher.)
- **Dashboard tiles didn't match the Applications page's status filter** — some statuses were grouped together on the dashboard (e.g. "Pending" = Submitted + Under Review) while the filter listed them individually. Rebuilt so both surfaces share one status list.
- **"Draft" leaked back into the status-change dropdown** on the application detail page after being removed from the dashboard/filter — different dropdown, needed its own fix. ("Submitted" was deliberately kept selectable there, unlike on the filter, since HR might legitimately revert a status.)
- **Document thumbnails failed to load** in initial testing — `loading="lazy"` on the `<img>` wasn't firing in the automated test environment; switched to eager loading (fine at this scale, ~10 thumbnails per page).

## Features added

- Multi-tenant data model, dynamic scoring engine, job/application/candidate management (initial build).
- Dashboard stat tiles made clickable — drill down to the exact matching Applications list instead of trusting a bare number.
- Live sync from the real Google Sheet: detects new rows since the last run (the Sheet is append-only — Zoho form responses can't be edited after submission) and imports only those; never touches or overwrites an existing application's status/assignment. ~17s for a no-op run, well under Vercel's function time limit.
- Inline document previews: small thumbnail per document (via Google Drive's public thumbnail endpoint), click opens a modal with Google's interactive viewer (zoom/pagination) plus an "Open in Drive" link.
- Icon-based, color-coded dashboard redesign matching the Okie Dokie brand palette (orange `#ee6723`, extracted from the logo).
- Okie Dokie branding: favicon, "Powered by" footer.

## Known limitations / things to revisit

- Vercel Hobby plan caps cron jobs at once/day — the Sheet sync can't run more often automatically without a plan upgrade (manual trigger via the protected `/api/sync-sheet` route is always available).
- Two stray duplicate Vercel projects (`jobapplicationform-2`, `jobapplicationform-b9jo`) exist in the account, disconnected from GitHub — flagged earlier, not yet deleted (offer still stands if wanted).
