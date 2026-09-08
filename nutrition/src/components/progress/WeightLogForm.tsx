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
    <form onSubmit={handleSubmit} className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Registrar peso de hoy</p>
      <div className="flex items-center gap-2">
        <input
          type="number"
          step="0.05"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="72.45"
          className="flex-1 rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
        <span className="text-sm text-[var(--text-secondary)]">kg</span>
        <button
          type="submit"
          disabled={!weight || isPending}
          className="rounded-xl bg-[var(--accent)] px-4 py-2 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
        >
          {isPending ? "…" : saved ? "✓" : "Guardar"}
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-[var(--text-secondary)]">
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
