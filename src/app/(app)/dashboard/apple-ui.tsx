import type { ComponentType, ReactNode, SVGProps } from "react";
import Link from "next/link";

// Dashboard-only design pass — Apple-style typography/spacing/shadows,
// kept separate from the shared components/ui/primitives.tsx on purpose
// so the rest of the app (Applications, Jobs, Admin, ...) is completely
// unaffected while this is still a preview. If this direction is
// approved, these are the components to fold back into the shared
// primitives for an app-wide rollout.

const CARD_SHADOW = "shadow-[0_1px_2px_rgba(15,23,42,0.04),0_12px_28px_-12px_rgba(15,23,42,0.10)]";

export function AppleCard({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`rounded-[22px] bg-white/90 ring-1 ring-black/[0.04] backdrop-blur-xl ${CARD_SHADOW} ${className}`}>
      {children}
    </div>
  );
}

export function AppleCardHeader({
  title,
  description,
  action,
}: {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-4 px-6 pb-4 pt-6">
      <div>
        <h2 className="text-[15px] font-semibold tracking-tight text-slate-900">{title}</h2>
        {description ? <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

const statTileTones = {
  default: "bg-slate-50 text-slate-600",
  brand: "bg-orange-50 text-orange-600",
} as const;

export function AppleStatTile({
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
  const content = (
    <>
      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-slate-500">{label}</p>
        {Icon ? (
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full ${statTileTones[tone]}`}>
            <Icon className="h-[18px] w-[18px]" />
          </span>
        ) : null}
      </div>
      <p className="mt-3 text-[34px] font-semibold leading-none tracking-tight tabular-nums text-slate-900">{value}</p>
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
