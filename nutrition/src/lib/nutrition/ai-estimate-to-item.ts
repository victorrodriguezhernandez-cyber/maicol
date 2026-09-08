import type { DraftItem } from "@/components/register/MealComposer";
import type { MealItemSource } from "./types";

export interface AiFoodEstimateItem {
  name: string;
  preparation: string | null;
  estimated_quantity: number;
  quantity_unit: string;
  range_min: number;
  range_max: number;
  confidence: "high" | "medium" | "low";
  contains_oil: boolean;
  contains_sauce: boolean;
  notes: string | null;
  energy_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
}

export interface AiMealEstimateResponse {
  items: AiFoodEstimateItem[];
  overall_confidence: "high" | "medium" | "low";
  unable_to_estimate: boolean;
  clarifying_questions: string[];
}

export function aiItemToDraft(item: AiFoodEstimateItem, source: MealItemSource): DraftItem {
  const parts = [item.name];
  if (item.preparation) parts.push(`(${item.preparation})`);

  // range_min/range_max describe the *quantity* range (section 11); the
  // kcal range shown to the user is that same proportion applied to the
  // point kcal estimate, not a separately-estimated calorie range.
  const kcalPerUnit = item.estimated_quantity > 0 ? item.energy_kcal / item.estimated_quantity : 0;

  return {
    key: crypto.randomUUID(),
    name: parts.join(" "),
    quantityAmount: item.estimated_quantity,
    quantityUnit: item.quantity_unit,
    gramsEquivalent: item.quantity_unit === "g" || item.quantity_unit === "ml" ? item.estimated_quantity : null,
    energyKcal: item.energy_kcal,
    proteinG: item.protein_g,
    carbohydratesG: item.carbohydrates_g,
    fatG: item.fat_g,
    fiberG: item.fiber_g,
    source,
    precisionLevel: "estimated",
    confidence: item.confidence,
    rangeKcalMin: item.range_min * kcalPerUnit,
    rangeKcalMax: item.range_max * kcalPerUnit,
  };
}
