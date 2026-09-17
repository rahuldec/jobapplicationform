"use client";

import { useRouter } from "next/navigation";
import { Button, inputClass } from "@/components/ui/primitives";

// PDF export is just the browser's own "Print > Save as PDF" — no server
// route needed. The signature column exists purely for the printed sheet
// (candidates sign in person as they arrive), so it stays blank on screen.
export function AttendanceControls({ date, hasRows }: { date: string; hasRows: boolean }) {
  const router = useRouter();

  return (
    <div className="flex flex-wrap items-end justify-between gap-3">
      <div>
        <label htmlFor="attendance-date" className="block text-sm font-medium text-slate-700">
          Date
        </label>
        <input
          id="attendance-date"
          type="date"
          defaultValue={date}
          onChange={(e) => {
            if (e.target.value) router.push(`/interview-attendance?date=${e.target.value}`);
          }}
          className={`${inputClass} mt-1.5 w-44`}
        />
      </div>
      <Button variant="secondary" onClick={() => window.print()} disabled={!hasRows}>
        Print / Save as PDF
      </Button>
    </div>
  );
}
