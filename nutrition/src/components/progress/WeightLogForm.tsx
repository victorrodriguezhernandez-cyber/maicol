"use client";

import { useState, useTransition } from "react";
import { addWeightEntry } from "@/lib/actions/weight";

export function WeightLogForm() {
  const [weight, setWeight] = useState("");
  const [usualConditions, setUsualConditions] = useState(true);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    startTransition(async () => {
      await addWeightEntry({
        measuredAt: new Date().toISOString(),
        weightKg: Number(weight),
        isUsualConditions: usualConditions,
      });
      setWeight("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 rounded-2xl border border-dashed border-[var(--border-strong)] p-3.5">
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium text-[var(--text-secondary)]">Peso de hoy</span>
        <input
          type="number"
          step="0.05"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="72.45"
          className="text-metric ml-auto w-24 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-1.5 text-right text-sm text-[var(--text-primary)]"
        />
        <span className="text-xs text-[var(--text-secondary)]">kg</span>
        <button
          type="submit"
          disabled={!weight || isPending}
          className="btn-primary tap-scale rounded-lg px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-fg)] disabled:opacity-50"
        >
          {isPending ? "…" : saved ? "✓" : "Guardar"}
        </button>
      </div>
      <label className="flex items-center gap-2 text-[11px] text-[var(--text-tertiary)]">
        <input
          type="checkbox"
          checked={usualConditions}
          onChange={(e) => setUsualConditions(e.target.checked)}
        />
        Condiciones habituales (mañana, en ayunas)
      </label>
    </form>
  );
}
