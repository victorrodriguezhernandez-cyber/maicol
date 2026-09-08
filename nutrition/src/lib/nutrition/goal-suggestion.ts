import { estimateInitialMaintenance, KCAL_PER_KG_BODY_MASS, type ActivityLevel } from "./tdee";

export interface GoalSuggestionInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female" | "unspecified";
  activityLevel: ActivityLevel;
  mode: "maintain" | "lose" | "gain";
  /** Midpoint of the desired weekly rate, kg/week (signed: negative to lose). */
  weeklyRateKgPerWeek: number;
  /** g protein per kg bodyweight; defaults depend on mode. */
  proteinPerKg?: number;
  /** Fraction of total kcal from fat. */
  fatKcalFraction?: number;
}

export interface GoalSuggestion {
  kcal: number;
  proteinG: number;
  fatG: number;
  carbohydratesG: number;
  fiberG: number;
  maintenanceEstimateKcal: number;
}

/**
 * Only ever a *starting point* (section 25: "puede sugerir... pero no
 * debe imponerlo") — every field this returns is meant to be user-edited
 * before being saved as the actual goal.
 */
export function suggestGoal(input: GoalSuggestionInput): GoalSuggestion {
  const maintenanceEstimateKcal = estimateInitialMaintenance(input);
  const dailySurplus = (input.weeklyRateKgPerWeek * KCAL_PER_KG_BODY_MASS) / 7;
  const kcal = Math.round(maintenanceEstimateKcal + dailySurplus);

  const defaultProteinPerKg = input.mode === "lose" ? 2.2 : input.mode === "gain" ? 1.8 : 2.0;
  const proteinPerKg = input.proteinPerKg ?? defaultProteinPerKg;
  const proteinG = Math.round(input.weightKg * proteinPerKg);

  const fatKcalFraction = input.fatKcalFraction ?? 0.27;
  const fatG = Math.round((kcal * fatKcalFraction) / 9);

  const proteinKcal = proteinG * 4;
  const fatKcal = fatG * 9;
  const carbohydratesG = Math.max(0, Math.round((kcal - proteinKcal - fatKcal) / 4));

  const fiberG = Math.round((kcal / 1000) * 14); // ~14g/1000kcal, standard dietary guideline

  return { kcal, proteinG, fatG, carbohydratesG, fiberG, maintenanceEstimateKcal };
}
