"use client";

import type { ReactNode } from "react";
import { useFormStatus } from "react-dom";

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
    "inline-flex items-center justify-center gap-1.5 rounded-xl font-semibold transition-all duration-150 ease-out active:scale-[0.97] focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-orange-500 disabled:opacity-50 disabled:pointer-events-none disabled:active:scale-100";
  const sizes = { sm: "px-3 py-1.5 text-[13px]", md: "px-4 py-2.5 text-[14px]" };
  const variants = {
    primary: "bg-orange-600 text-white shadow-sm shadow-orange-600/20 hover:bg-orange-700 hover:shadow-md hover:shadow-orange-600/25",
    secondary: "bg-white text-slate-700 ring-1 ring-inset ring-slate-200 shadow-sm hover:bg-slate-50 hover:ring-slate-300",
    ghost: "text-slate-600 hover:bg-slate-100",
    danger: "bg-red-600 text-white shadow-sm shadow-red-600/20 hover:bg-red-700 hover:shadow-md hover:shadow-red-600/25",
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
