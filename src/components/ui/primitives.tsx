import type { ReactNode } from "react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

// Button is a Client Component (it uses useFormStatus for submit-pending
// state) and lives in its own file so the rest of this module can stay
// server-safe — these components are used from Server Components that pass
// non-serializable props like icon component references (e.g. StatTile's
// `icon`), which breaks the moment the module itself carries "use client".
export { Button } from "./button";

// Soft, diffuse shadow (vs. a flat drop shadow) plus a hairline ring
// instead of a heavier border — this is the Apple-style card treatment
// rolled out from the Dashboard preview to the whole app.
const CARD_SHADOW = "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-12px_rgba(15,23,42,0.10)]";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <div className={`rounded-[22px] bg-white/90 ring-1 ring-black/[0.04] backdrop-blur-xl ${CARD_SHADOW} ${className}`}>{children}</div>;
}

export function CardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-black/[0.04] px-6 pb-4 pt-6">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

// A Card that starts collapsed and expands on click — pure HTML
// <details>/<summary>, so it needs no client-side JS and works from a
// Server Component with server-action forms inside. Use for long config
// pages where every section doesn't need to be visible at once.
export function CollapsibleCard({
  title,
  description,
  defaultOpen = false,
  className = "",
  children,
}: {
  title: ReactNode;
  description?: ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <details open={defaultOpen} className={`group rounded-[22px] bg-white/90 ring-1 ring-black/[0.04] backdrop-blur-xl ${CARD_SHADOW} ${className}`}>
      <summary className="marker:hidden flex cursor-pointer list-none items-center justify-between gap-4 px-6 py-5 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
          {description ? <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p> : null}
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-4 w-4 shrink-0 text-slate-400 transition-transform duration-200 group-open:rotate-180"
        >
          <path
            fillRule="evenodd"
            d="M5.23 7.21a.75.75 0 0 1 1.06.02L10 11.168l3.71-3.938a.75.75 0 1 1 1.08 1.04l-4.25 4.5a.75.75 0 0 1-1.08 0l-4.25-4.5a.75.75 0 0 1 .02-1.06Z"
            clipRule="evenodd"
          />
        </svg>
      </summary>
      <div className="border-t border-black/[0.04]">{children}</div>
    </details>
  );
}

const statTileTones = {
  default: { text: "text-slate-900", chip: "bg-slate-50 text-slate-600" },
  brand: { text: "text-slate-900", chip: "bg-orange-50 text-orange-600" },
  warning: { text: "text-slate-900", chip: "bg-amber-50 text-amber-600" },
  success: { text: "text-slate-900", chip: "bg-emerald-50 text-emerald-600" },
  danger: { text: "text-slate-900", chip: "bg-red-50 text-red-600" },
} as const;

export function StatTile({
  label,
  value,
  sublabel,
  tone = "brand",
  href,
  icon: Icon,
}: {
  label: string;
  value: string | number;
  sublabel?: string;
  tone?: keyof typeof statTileTones;
  href?: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
}) {
  const tones = statTileTones[tone];
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {Icon ? (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${tones.chip}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>
      <p className={`mt-3 text-[34px] font-semibold leading-none tracking-tight tabular-nums ${tones.text}`}>{value}</p>
      {sublabel ? <p className="mt-2 text-[13px] leading-snug text-slate-500">{sublabel}</p> : null}
    </>
  );

  const base = `block rounded-[22px] bg-white/90 p-5 ring-1 ring-black/[0.04] backdrop-blur-xl ${CARD_SHADOW}`;

  if (href) {
    return (
      <Link
        href={href}
        className={`${base} transition-all duration-300 ease-out hover:-translate-y-1 hover:shadow-[0_1px_2px_rgba(15,23,42,0.04),0_20px_36px_-12px_rgba(15,23,42,0.16)]`}
        title="Click to see the matching applications"
      >
        {content}
      </Link>
    );
  }

  return <div className={base}>{content}</div>;
}

// Sub-metric tile for OverviewCard — a colored dot + uppercase label
// above a large bold number, denser than StatTile for grouping several
// related numbers under one heading instead of separate top-level cards.
export function OverviewSubTile({ label, value, color, href }: { label: string; value: string | number; color: string; href?: string }) {
  const content = (
    <div className="rounded-2xl bg-white/70 px-4 py-3.5 ring-1 ring-black/[0.04] transition-colors hover:bg-white">
      <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
        <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: color }} />
        {label}
      </div>
      <p className="mt-1.5 text-[22px] font-bold tabular-nums tracking-tight text-slate-900">{value}</p>
    </div>
  );
  return href ? (
    <Link href={href} className="block">
      {content}
    </Link>
  ) : (
    content
  );
}

const overviewBadgeTones = {
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  slate: "bg-slate-50 text-slate-700 ring-slate-200",
} as const;

// A highlighted summary card — eyebrow + title, an optional tone-colored
// completion badge, and a row of OverviewSubTile numbers — for the one
// "here's the state of things" block at the top of a page, in place of a
// flat row of separate StatTiles. Introduced for Dashboard, reused
// wherever another page has the same shape of data (see Emails).
export function OverviewCard({
  title,
  badgeLabel,
  badgeTone = "green",
  children,
}: {
  title: ReactNode;
  badgeLabel?: string;
  badgeTone?: keyof typeof overviewBadgeTones;
  children: ReactNode;
}) {
  return (
    <Card className="overflow-hidden bg-gradient-to-br from-orange-50/70 via-white to-white ring-1 ring-orange-100">
      <div className="flex items-start justify-between gap-4 px-6 pt-6">
        <div>
          <p className="text-[13px] font-semibold uppercase tracking-wide text-slate-400">Overview</p>
          <h2 className="mt-1 text-[20px] font-bold tracking-tight text-slate-900">{title}</h2>
        </div>
        {badgeLabel && (
          <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] font-semibold ring-1 ring-inset ${overviewBadgeTones[badgeTone]}`}>
            {badgeLabel}
          </span>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3 px-6 pb-6 pt-5 sm:grid-cols-4">{children}</div>
    </Card>
  );
}

const badgeTones: Record<string, string> = {
  slate: "bg-slate-100 text-slate-700 ring-slate-200",
  blue: "bg-blue-50 text-blue-700 ring-blue-200",
  amber: "bg-amber-50 text-amber-700 ring-amber-200",
  green: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  red: "bg-red-50 text-red-700 ring-red-200",
  purple: "bg-violet-50 text-violet-700 ring-violet-200",
};

export function Badge({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: keyof typeof badgeTones;
}) {
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[12px] font-semibold ring-1 ring-inset ${badgeTones[tone]}`}>
      {children}
    </span>
  );
}

const statusTone: Record<string, keyof typeof badgeTones> = {
  draft: "slate",
  published: "green",
  closed: "slate",
  submitted: "blue",
  under_review: "amber",
  shortlisted: "purple",
  interview_scheduled: "purple",
  interviewed: "purple",
  selected: "green",
  rejected: "red",
  withdrawn: "slate",
  archived: "slate",
};

export function StatusBadge({ status, label }: { status: string; label: string }) {
  return <Badge tone={statusTone[status] ?? "slate"}>{label}</Badge>;
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 px-6 py-16 text-center">
      <p className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</p>
      {description ? <p className="mt-1.5 max-w-sm text-[14px] text-slate-500">{description}</p> : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}

// Shared by any email-template field (interview template, bulk compose)
// that supports {placeholder} substitution — renders each name as a chip
// so admins can see at a glance what's available without memorizing them.
export function PlaceholderChips({ names }: { names: string[] }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span>Placeholders:</span>
      {names.map((p) => (
        <code
          key={p}
          className="rounded-md bg-orange-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200"
        >
          {`{${p}}`}
        </code>
      ))}
    </span>
  );
}

export function Field({
  label,
  htmlFor,
  required,
  hint,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  hint?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="block text-[13px] font-semibold text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <div className="mt-1.5 text-[13px] text-slate-500">{hint}</div> : null}
    </div>
  );
}

export const inputClass =
  "block w-full rounded-xl border-0 px-3.5 py-2.5 text-[14px] text-slate-900 ring-1 ring-inset ring-slate-200 placeholder:text-slate-400 transition-shadow focus:ring-2 focus:ring-inset focus:ring-orange-500";
