/**
 * How much to trust a food item's nutritional numbers, as a short label +
 * a color tier — shared by MealComposer's ConfidenceBadge (draft items,
 * before saving) and MealItemRow (already-saved meal_items).
 *
 * This used to be two separate, buggy implementations: MealItemRow's
 * PRECISION_LABEL keyed only on precisionLevel and never looked at
 * confidence at all, and MealComposer's version checked confidence but
 * only branched on "low" — so "medium" *and* "high" both fell through to
 * the same "Media/Baja" label. Every AI estimate landed on the same
 * label regardless of what the model actually reported. Fixed here once,
 * for both call sites.
 */
export type PrecisionLevel = "exact" | "calculated" | "estimated" | "unknown" | string;
export type Confidence = "high" | "medium" | "low" | null | undefined;

export interface EstimateQuality {
  label: string;
  tier: "high" | "medium" | "low" | "unknown";
}

export function estimateQuality(precisionLevel: PrecisionLevel, confidence?: Confidence): EstimateQuality {
  if (precisionLevel === "exact") return { label: "Alta", tier: "high" };
  if (precisionLevel === "calculated") return { label: "Media", tier: "medium" };
  if (precisionLevel === "estimated") {
    // Still an AI estimate even at "high" confidence — never "Alta", but
    // "Media-alta" honestly distinguishes it from a genuinely uncertain one.
    if (confidence === "high") return { label: "Media-alta", tier: "medium" };
    if (confidence === "low") return { label: "Baja", tier: "low" };
    return { label: "Media", tier: "medium" };
  }
  return { label: "Desconocida", tier: "unknown" };
}

export function estimateQualityColor(tier: EstimateQuality["tier"]): string {
  switch (tier) {
    case "high":
      return "var(--success)";
    case "medium":
      return "var(--accent)";
    case "low":
      return "var(--warning)";
    default:
      return "var(--text-tertiary)";
  }
}
