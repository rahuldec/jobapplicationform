"use client";

import { useEffect, useState } from "react";

function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
  return match ? match[1] : null;
}

export function DocumentThumbnail({ url, label }: { url: string; label: string }) {
  const [open, setOpen] = useState(false);
  const fileId = extractDriveFileId(url);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (!fileId) {
    return <span className="text-xs italic text-slate-400">No preview</span>;
  }

  const thumbUrl = `https://drive.google.com/thumbnail?id=${fileId}&sz=w200`;
  const previewUrl = `https://drive.google.com/file/d/${fileId}/preview`;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="group h-12 w-12 shrink-0 overflow-hidden rounded-md border border-slate-200 bg-slate-50 transition-transform duration-150 hover:z-10 hover:scale-[2.4] hover:shadow-lg hover:ring-2 hover:ring-orange-400"
        title={`Click to preview ${label}`}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={thumbUrl} alt={label} className="h-full w-full object-cover" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 p-6"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex h-[85vh] w-full max-w-3xl flex-col overflow-hidden rounded-lg bg-white shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3">
              <p className="text-sm font-medium text-slate-900">{label}</p>
              <div className="flex items-center gap-3">
                <a
                  href={url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs font-medium text-orange-600 hover:underline"
                >
                  Open in Drive ↗
                </a>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Close preview"
                >
                  ✕
                </button>
              </div>
            </div>
            <iframe src={previewUrl} className="min-h-0 flex-1" title={label} />
          </div>
        </div>
      )}
    </>
  );
}
