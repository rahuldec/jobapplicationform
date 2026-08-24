// Minimal inline icon set (no external dependency) used for dashboard
// stat tiles and activity/attention lists. Each is a plain stroked SVG,
// sized via className, so callers control size/color with Tailwind.
import type { SVGProps } from "react";

type IconProps = SVGProps<SVGSVGElement>;

const base = "stroke-current fill-none";
const strokeProps = { strokeWidth: 1.75, strokeLinecap: "round" as const, strokeLinejoin: "round" as const };

export function IconLayers(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <path d="M12 3l8 4.5-8 4.5-8-4.5L12 3z" />
      <path d="M4 12l8 4.5 8-4.5" />
      <path d="M4 16.5l8 4.5 8-4.5" />
    </svg>
  );
}

export function IconPaperPlane(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <path d="M21 3L3 10.5l7 2.5 2.5 7L21 3z" />
      <path d="M12.5 13.5L21 3" />
    </svg>
  );
}

export function IconSearch(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <circle cx="11" cy="11" r="6.5" />
      <path d="M20 20l-4.5-4.5" />
    </svg>
  );
}

export function IconStar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.2 1 5.9-5.2-2.8-5.2 2.8 1-5.9-4.3-4.2 5.9-.8L12 3.5z" />
    </svg>
  );
}

export function IconCalendar(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <rect x="3.5" y="5" width="17" height="15.5" rx="2" />
      <path d="M3.5 9.5h17M8 3v4M16 3v4" />
    </svg>
  );
}

export function IconUsers(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <circle cx="9" cy="8.5" r="3" />
      <path d="M3.5 19.5c.7-3 2.9-4.7 5.5-4.7s4.8 1.7 5.5 4.7" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M15.5 14.5c2 .2 3.6 1.7 4.1 4" />
    </svg>
  );
}

export function IconCheckCircle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M8.5 12.5l2.3 2.3 4.7-5.1" />
    </svg>
  );
}

export function IconXCircle(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M9 9l6 6M15 9l-6 6" />
    </svg>
  );
}

export function IconArchive(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <rect x="3.5" y="4" width="17" height="4.5" rx="1.2" />
      <path d="M4.5 8.5v9.3a1.7 1.7 0 001.7 1.7h11.6a1.7 1.7 0 001.7-1.7V8.5" />
      <path d="M10 13h4" />
    </svg>
  );
}

export function IconFileWarning(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <path d="M7 3h7l4 4v13a1 1 0 01-1 1H7a1 1 0 01-1-1V4a1 1 0 011-1z" />
      <path d="M14 3v4h4" />
      <path d="M12 11v3.5" />
      <circle cx="12" cy="17" r="0.6" fill="currentColor" stroke="none" />
    </svg>
  );
}

export function IconClock(props: IconProps) {
  return (
    <svg viewBox="0 0 24 24" className={base} {...strokeProps} {...props}>
      <circle cx="12" cy="12" r="8.5" />
      <path d="M12 7.5V12l3 2" />
    </svg>
  );
}
