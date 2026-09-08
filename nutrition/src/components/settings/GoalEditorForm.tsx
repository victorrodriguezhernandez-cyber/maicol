"use client";

import { useState, useTransition } from "react";
import { applyGoalChange } from "@/lib/actions/goals";
import type { NutritionGoalRow } from "@/lib/supabase/types";

export function GoalEditorForm({ goal }: { goal: NutritionGoalRow }) {
  const [mode, setMode] = useState(goal.mode);
  const [kcal, setKcal] = useState(String(goal.kcal));
  const [proteinG, setProteinG] = useState(String(goal.protein_g));
  const [carbohydratesG, setCarbohydratesG] = useState(String(goal.carbohydrates_g));
  const [fatG, setFatG] = useState(String(goal.fat_g));
  const [fiberG, setFiberG] = useState(goal.fiber_g != null ? String(goal.fiber_g) : "");
  const [weeklyRateMinKg, setWeeklyRateMinKg] = useState(
    goal.weekly_rate_min_kg != null ? String(goal.weekly_rate_min_kg) : "",
  );
  const [weeklyRateMaxKg, setWeeklyRateMaxKg] = useState(
    goal.weekly_rate_max_kg != null ? String(goal.weekly_rate_max_kg) : "",
  );
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      await applyGoalChange({
        mode,
        kcal: Number(kcal),
        proteinG: Number(proteinG),
        carbohydratesG: Number(carbohydratesG),
        fatG: Number(fatG),
        fiberG: fiberG ? Number(fiberG) : null,
        weeklyRateMinKg: weeklyRateMinKg ? Number(weeklyRateMinKg) : null,
        weeklyRateMaxKg: weeklyRateMaxKg ? Number(weeklyRateMaxKg) : null,
        source: "manual",
      });
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-3.5 rounded-2xl p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Objetivo</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as typeof mode)}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="maintain">Mantener</option>
          <option value="lose">Perder peso</option>
          <option value="gain">Ganar peso / volumen</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <Field label="Calorías (kcal)" value={kcal} onChange={setKcal} />
        <Field label="Proteína (g)" value={proteinG} onChange={setProteinG} />
        <Field label="Carbohidratos (g)" value={carbohydratesG} onChange={setCarbohydratesG} />
        <Field label="Grasas (g)" value={fatG} onChange={setFatG} />
        <Field label="Fibra (g)" value={fiberG} onChange={setFiberG} />
      </div>

      {mode !== "maintain" ? (
        <div className="grid grid-cols-2 gap-3">
          <Field label="Ritmo mínimo (kg/semana)" value={weeklyRateMinKg} onChange={setWeeklyRateMinKg} step="0.05" />
          <Field label="Ritmo máximo (kg/semana)" value={weeklyRateMaxKg} onChange={setWeeklyRateMaxKg} step="0.05" />
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl btn-primary py-2.5 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
      </button>
    </form>
  );
}

function Field({
  label,
  value,
  onChange,
  step,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  step?: string;
}) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      <input
        type="number"
        step={step}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
      />
    </label>
  );
}
