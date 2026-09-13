"use client";

import { useState } from "react";
import { addWeightEntry } from "@/lib/actions/weight";
import { useActionRunner } from "@/lib/hooks/useActionRunner";
import { ScaleIcon, CheckIcon } from "@/components/ui/icons";

export function WeightLogForm() {
  const [weight, setWeight] = useState("");
  const [usualConditions, setUsualConditions] = useState(true);
  const { run, isPending, error } = useActionRunner();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!weight) return;
    run(async () => {
      await addWeightEntry({
        measuredAt: new Date().toISOString(),
        weightKg: Number(weight),
        isUsualConditions: usualConditions,
      });
      // Only cleared once the write actually succeeded — on failure the
      // typed weight stays in the field so it isn't lost.
      setWeight("");
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3.5">
      <div className="flex items-center gap-2.5">
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full" style={{ background: "var(--metric-weight-soft)", color: "var(--metric-weight)" }}>
          <ScaleIcon size={15} />
        </span>
        <input
          type="number"
          step="0.05"
          inputMode="decimal"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
          placeholder="Peso de hoy"
          className="text-metric flex-1 rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
        <span className="text-xs text-[var(--text-secondary)]">kg</span>
        <button
          type="submit"
          disabled={!weight || isPending}
          className={`tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold disabled:opacity-50 ${
            saved ? "text-white" : "btn-primary text-[var(--accent-fg)]"
          }`}
          style={saved ? { background: "var(--success)" } : undefined}
          aria-label="Guardar peso"
        >
          {isPending ? "…" : <CheckIcon size={15} />}
        </button>
      </div>
      {error ? (
        <p role="alert" className="pl-[42px] text-[11px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <label className="flex items-center gap-2 pl-[42px] text-[11px] text-[var(--text-tertiary)]">
        <input type="checkbox" checked={usualConditions} onChange={(e) => setUsualConditions(e.target.checked)} />
        Condiciones habituales (mañana, en ayunas)
      </label>
    </form>
  );
}
