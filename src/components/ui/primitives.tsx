"use client";

import type { ReactNode } from "react";
import Link from "next/link";
import type { ComponentType, SVGProps } from "react";
import { useFormStatus } from "react-dom";

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

function ButtonSpinner() {
  return (
    <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
    </svg>
  );
}

export function Button({
  children,
  variant = "primary",
  size = "md",
  type = "button",
  className = "",
  disabled,
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md";
  type?: "button" | "submit";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  // useFormStatus reports pending only for the nearest ancestor <form> while
  // it's submitting — so a submit button reflects its own form's in-flight
  // state instantly, without every caller needing its own pending state.
  // Returns pending:false when there's no ancestor form, so this is safe on
  // every Button regardless of whether it's ever inside one.
  const { pending } = useFormStatus();
  const isPending = type === "submit" && pending;
  const base =
    "inline-flex items-center justify-center gap-1.5 rounded-md font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-orange-500 disabled:opacity-50 disabled:pointer-events-none";
  const sizes = { sm: "px-2.5 py-1.5 text-xs", md: "px-3.5 py-2 text-sm" };
  const variants = {
    primary: "bg-orange-600 text-white hover:bg-orange-700",
    secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-300 hover:bg-slate-50",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white hover:bg-red-700",
  };
  return (
    <button
      type={type}
      disabled={disabled || isPending}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}
      {...rest}
    >
      {isPending && <ButtonSpinner />}
      {children}
    </button>
  );
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
