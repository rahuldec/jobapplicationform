"use client";

import { useState } from "react";
import { inputClass } from "@/components/ui/primitives";

// A plain <input type="color"> only shows a solid swatch — no way to see
// or type the hex value, so matching a brand's exact color means
// eyeballing it in the OS picker. Pairs the swatch with a synced hex
// text field so an admin can paste a known hex code directly, or use
// the swatch to pick visually — either updates the other.
export function ColorPickerField({
  name,
  defaultValue,
  label,
}: {
  name: string;
  defaultValue: string;
  label: string;
}) {
  const [value, setValue] = useState(defaultValue);

  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-slate-700">
        {label}
      </label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          type="color"
          value={/^#[0-9a-fA-F]{6}$/.test(value) ? value : "#000000"}
          onChange={(e) => setValue(e.target.value)}
          className="h-10 w-12 shrink-0 cursor-pointer rounded-md border-0 ring-1 ring-inset ring-slate-300"
          aria-label={`${label} — visual picker`}
        />
        <input
          id={name}
          name={name}
          type="text"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={`${inputClass} flex-1`}
          placeholder="#0f2359"
        />
      </div>
    </div>
  );
}
