"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

// Client-only (Escape handling, body-scroll lock) so it lives in its own
// file like Button — keeping the rest of primitives.tsx server-safe.
export function Modal({
  open,
  onClose,
  title,
  description,
  children,
  widthClass = "max-w-lg",
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  widthClass?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6">
      <div className="modal-overlay absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        className={`modal-panel relative flex max-h-[85vh] w-full ${widthClass} flex-col overflow-hidden rounded-[22px] bg-white/95 ring-1 ring-black/[0.06] backdrop-blur-xl shadow-[0_8px_16px_rgba(15,23,42,0.08),0_32px_64px_-16px_rgba(15,23,42,0.25)]`}
      >
        <div className="flex shrink-0 items-start justify-between gap-4 border-b border-black/[0.04] px-6 pb-4 pt-6">
          <div>
            <h2 className="text-[16px] font-semibold tracking-tight text-slate-900">{title}</h2>
            {description ? <p className="mt-1 text-[13px] leading-relaxed text-slate-500">{description}</p> : null}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-600"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
              <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
            </svg>
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-6 py-5">{children}</div>
      </div>
    </div>
  );
}
