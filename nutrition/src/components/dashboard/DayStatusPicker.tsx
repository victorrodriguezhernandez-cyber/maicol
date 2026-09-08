"use client";

import { useTransition } from "react";
import { setDayStatus } from "@/lib/actions/day-logs";

const OPTIONS = [
  { value: "complete", label: "Día completo" },
  { value: "partial", label: "Día parcial" },
  { value: "not_logged", label: "Sin registrar" },
] as const;

export function DayStatusPicker({
  date,
  current,
}: {
  date: string;
  current: "complete" | "partial" | "not_logged";
}) {
  const [isPending, startTransition] = useTransition();

  return (
    <div className="flex gap-1.5">
      {OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => setDayStatus(date, opt.value))}
          className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${
            current === opt.value
              ? "border-[var(--accent)] bg-[var(--accent-soft)] text-[var(--accent)]"
              : "border-[var(--border)] text-[var(--text-secondary)]"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
