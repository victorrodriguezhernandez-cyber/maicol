"use client";

import { useState, useTransition } from "react";
import { applyGoalChange } from "@/lib/actions/goals";
import { formatKcal } from "@/lib/format";
import type { AdaptiveGoalSuggestion } from "@/lib/nutrition/adaptive-goal";
import type { NutritionGoalRow } from "@/lib/supabase/types";
import { TrendIcon, ChevronDownIcon } from "@/components/ui/icons";

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
    <div className="surface-raised border-l-[3px] border-[var(--accent)] p-4">
      <div className="flex items-start gap-3">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          <TrendIcon size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-[var(--text-primary)]">{suggestion.reason}</p>
          <p className="text-metric mt-1.5 flex items-center gap-1.5 text-sm text-[var(--text-primary)]">
            {formatKcal(currentGoal.kcal)}
            <span className="text-[var(--text-tertiary)]">→</span>
            <span style={{ color: "var(--accent)" }}>{formatKcal(suggestion.suggestedKcal)}</span>
          </p>
          <p className="mt-1 text-[11px] text-[var(--text-tertiary)]">
            Confianza {suggestion.confidence === "high" ? "alta" : suggestion.confidence === "medium" ? "media" : "baja"}
          </p>
        </div>
      </div>

      {showAnalysis ? (
        <div className="mt-3 rounded-xl bg-[var(--surface-2)] p-3 text-xs text-[var(--text-secondary)]">
          <p>Mantenimiento estimado: {formatKcal(suggestion.maintenanceEstimate.maintenanceKcal ?? 0)}</p>
          {suggestion.maintenanceEstimate.rangeMin != null ? (
            <p>
              Rango: {formatKcal(suggestion.maintenanceEstimate.rangeMin)} – {formatKcal(suggestion.maintenanceEstimate.rangeMax!)}
            </p>
          ) : null}
        </div>
      ) : null}

      <div className="mt-3 flex items-center gap-2">
        <button
          type="button"
          disabled={isPending}
          onClick={apply}
          className="btn-primary tap-scale rounded-lg px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-fg)] disabled:opacity-50"
        >
          Aplicar
        </button>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="btn-secondary tap-scale rounded-lg px-3.5 py-1.5 text-xs font-semibold"
        >
          Mantener
        </button>
        <button
          type="button"
          onClick={() => setShowAnalysis((v) => !v)}
          className="tap-scale ml-auto flex items-center gap-1 text-xs font-medium text-[var(--accent)]"
        >
          Ver análisis
          <ChevronDownIcon size={13} className={`transition-transform ${showAnalysis ? "rotate-180" : ""}`} />
        </button>
      </div>
    </div>
  );
}
