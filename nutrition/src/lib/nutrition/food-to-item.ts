import type { FoodRow } from "@/lib/supabase/types";
import { scaleFromPer100 } from "./macros";
import type { DraftItem } from "@/components/register/MealComposer";

/**
 * Converts a catalog food into an editable diary draft item at a given
 * consumed quantity, scaling from whatever basis the food was stored at.
 */
export function foodToDraftItem(food: FoodRow, quantityAmount: number): DraftItem {
  const isServingBasis = food.basis === "per_serving";
  const per100Equivalent = isServingBasis && food.serving_size_g
    ? {
        energy_kcal: (food.energy_kcal / food.serving_size_g) * 100,
        protein_g: (food.protein_g / food.serving_size_g) * 100,
        carbohydrates_g: (food.carbohydrates_g / food.serving_size_g) * 100,
        sugars_g: food.sugars_g != null ? (food.sugars_g / food.serving_size_g) * 100 : null,
        fat_g: (food.fat_g / food.serving_size_g) * 100,
        saturated_fat_g:
          food.saturated_fat_g != null ? (food.saturated_fat_g / food.serving_size_g) * 100 : null,
        fiber_g: food.fiber_g != null ? (food.fiber_g / food.serving_size_g) * 100 : null,
        sodium_mg: food.sodium_mg != null ? (food.sodium_mg / food.serving_size_g) * 100 : null,
        salt_g: food.salt_g != null ? (food.salt_g / food.serving_size_g) * 100 : null,
        micronutrients: {},
      }
    : {
        energy_kcal: food.energy_kcal,
        protein_g: food.protein_g,
        carbohydrates_g: food.carbohydrates_g,
        sugars_g: food.sugars_g,
        fat_g: food.fat_g,
        saturated_fat_g: food.saturated_fat_g,
        fiber_g: food.fiber_g,
        sodium_mg: food.sodium_mg,
        salt_g: food.salt_g,
        micronutrients: {},
      };

  const scaled = scaleFromPer100(per100Equivalent, quantityAmount);

  return {
    key: crypto.randomUUID(),
    foodId: food.id,
    name: food.brand ? `${food.name} (${food.brand})` : food.name,
    quantityAmount,
    quantityUnit: food.basis === "per_100ml" ? "ml" : "g",
    gramsEquivalent: quantityAmount,
    energyKcal: scaled.energy_kcal,
    proteinG: scaled.protein_g,
    carbohydratesG: scaled.carbohydrates_g,
    fatG: scaled.fat_g,
    fiberG: scaled.fiber_g,
    source: food.source,
    precisionLevel: "exact",
  };
}
