"use client";

import { useState, useTransition } from "react";
import { applyGoalChange } from "@/lib/actions/goals";
import { formatKcal } from "@/lib/format";
import type { AdaptiveGoalSuggestion } from "@/lib/nutrition/adaptive-goal";
import type { NutritionGoalRow } from "@/lib/supabase/types";

export function AdaptiveGoalCard({
  suggestion,
  currentGoal,
}: {
  suggestion: AdaptiveGoalSuggestion;
  currentGoal: NutritionGoalRow;
}) {
  const [dismissed, setDismissed] = useState(false);
  const [showAnalysis, setShowAnalysis] = useState(false);
  const [isPending, startTransition] = useTransition();

  if (!suggestion.hasSuggestion || dismissed || suggestion.suggestedKcal == null) return null;

  function apply() {
    startTransition(async () => {
      await applyGoalChange({
        kcal: suggestion.suggestedKcal!,
        proteinG: currentGoal.protein_g,
        carbohydratesG: currentGoal.carbohydrates_g,
        fatG: currentGoal.fat_g,
        fiberG: currentGoal.fiber_g,
        source: "ai_suggestion",
      });
      setDismissed(true);
    });
  }

  return (
    <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-4 shadow-[var(--shadow-sm)]">
      <p className="text-sm text-[var(--text-primary)]">
        {suggestion.reason} Propongo {suggestion.deltaKcal! > 0 ? "aumentar" : "reducir"} el objetivo
        diario de {formatKcal(currentGoal.kcal)} a {formatKcal(suggestion.suggestedKcal)}.
      </p>
      <p className="mt-1 text-xs text-[var(--text-secondary)]">
        Confianza: {suggestion.confidence === "high" ? "alta" : suggestion.confidence === "medium" ? "media" : "baja"}
      </p>

      {showAnalysis ? (
        <div className="mt-2 rounded-xl bg-[var(--surface)] p-3 text-xs text-[var(--text-secondary)]">
          <p>Mantenimiento estimado: {formatKcal(suggestion.maintenanceEstimate.maintenanceKcal ?? 0)}</p>
          {suggestion.maintenanceEstimate.rangeMin != null ? (
            <p>
              Rango: {formatKcal(suggestion.maintenanceEstimate.rangeMin)} – {formatKcal(suggestion.maintenanceEstimate.rangeMax!)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={apply}
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)] disabled:opacity-50"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
        >
          Mantener
        </button>
        <button
          type="button"
          onClick={() => setShowAnalysis((v) => !v)}
          className="rounded-lg px-3 py-1.5 text-xs text-[var(--accent)]"
        >
          Ver análisis
        </button>
      </div>
    </div>
  );
}
