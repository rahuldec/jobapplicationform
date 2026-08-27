import type { ReactNode } from "react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";

// Button is a Client Component (it uses useFormStatus for submit-pending
// state) and lives in its own file so the rest of this module can stay
// server-safe — these components are used from Server Components that pass
// non-serializable props like icon component references (e.g. StatTile's
// `icon`), which breaks the moment the module itself carries "use client".
export { Button } from "./button";

export function Card({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 ${className}`}>{children}</div>
  );
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
    <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4">
      <div>
        <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
        {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
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
    <details open={defaultOpen} className={`group rounded-xl bg-white shadow-sm ring-1 ring-slate-200/70 ${className}`}>
      <summary className="marker:hidden flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 [&::-webkit-details-marker]:hidden">
        <div>
          <h2 className="text-sm font-semibold text-slate-900">{title}</h2>
          {description ? <p className="mt-0.5 text-sm text-slate-500">{description}</p> : null}
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
      <div className="border-t border-slate-200">{children}</div>
    </details>
  );
}

const statTileTones = {
  default: { text: "text-slate-900", chip: "bg-slate-100 text-slate-600" },
  brand: { text: "text-orange-700", chip: "bg-orange-100 text-orange-600" },
  warning: { text: "text-amber-600", chip: "bg-amber-50 text-amber-600" },
  success: { text: "text-emerald-600", chip: "bg-emerald-50 text-emerald-600" },
  danger: { text: "text-red-600", chip: "bg-red-50 text-red-600" },
} as const;

export function StatTile({
  label,
  value,
  sublabel,
  tone = "default",
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
        <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
        {Icon ? (
          <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tones.chip}`}>
            <Icon className="h-4 w-4" />
          </span>
        ) : null}
      </div>
      <p className={`mt-2 text-[1.75rem] font-semibold leading-none tabular-nums ${tones.text}`}>{value}</p>
      {sublabel ? <p className="mt-1.5 text-xs text-slate-500">{sublabel}</p> : null}
    </>
  );

  if (href) {
    return (
      <Link
        href={href}
        className="block rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200/70 transition-all hover:-translate-y-0.5 hover:shadow-md hover:ring-orange-200"
        title="Click to see the matching applications"
      >
        {content}
      </Link>
    );
  }

  return <div className="rounded-xl bg-white px-4 py-4 shadow-sm ring-1 ring-slate-200/70">{content}</div>;
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
    <span
      className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${badgeTones[tone]}`}
    >
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
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 px-6 py-14 text-center">
      <p className="text-sm font-medium text-slate-900">{title}</p>
      {description ? <p className="mt-1 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-4">{action}</div> : null}
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
          className="rounded bg-orange-50 px-1.5 py-0.5 font-mono text-[11px] font-medium text-orange-700 ring-1 ring-inset ring-orange-200"
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
      <label htmlFor={htmlFor} className="block text-sm font-medium text-slate-700">
        {label}
        {required ? <span className="ml-0.5 text-red-500">*</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {hint ? <div className="mt-1 text-xs text-slate-500">{hint}</div> : null}
    </div>
  );
}

export const inputClass =
  "block w-full rounded-md border-0 px-3 py-2 text-sm text-slate-900 ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-orange-500";
