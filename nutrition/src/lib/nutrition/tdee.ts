/**
 * Section 26: calorie estimation starts from a standard formula, then is
 * progressively replaced by data actually observed from *this* user.
 * Neither number is ever presented as an exact metabolic measurement —
 * both always carry a confidence label.
 */

export type ActivityLevel =
  | "sedentary"
  | "light"
  | "moderate"
  | "very_active"
  | "extra_active";

const ACTIVITY_MULTIPLIERS: Record<ActivityLevel, number> = {
  sedentary: 1.2,
  light: 1.375,
  moderate: 1.55,
  very_active: 1.725,
  extra_active: 1.9,
};

export interface InitialTdeeInput {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: "male" | "female" | "unspecified";
  activityLevel: ActivityLevel;
}

/**
 * Mifflin-St Jeor BMR, scaled by a standard activity multiplier. This is
 * only ever the *starting point* before enough real data exists — see
 * `computeAdaptiveMaintenance` for what supersedes it.
 */
export function estimateInitialMaintenance(input: InitialTdeeInput): number {
  const { weightKg, heightCm, age, sex } = input;
  const base = 10 * weightKg + 6.25 * heightCm - 5 * age;
  const bmr = sex === "male" ? base + 5 : sex === "female" ? base - 161 : base - 78;
  return bmr * ACTIVITY_MULTIPLIERS[input.activityLevel];
}

export type EstimateConfidence = "high" | "medium" | "low" | "insufficient_data";

export interface AdaptiveMaintenanceInput {
  /** Average kcal actually logged per day over the analysis window. */
  avgLoggedKcalPerDay: number;
  /** Trend weight change (kg) from the start to the end of the window. */
  trendWeightChangeKg: number;
  windowDays: number;
  /** How many of those days had a reliable (complete) food log. */
  reliableDays: number;
  /** How many distinct weigh-in days fall inside the window. */
  weighInDays: number;
}

export interface AdaptiveMaintenanceResult {
  maintenanceKcal: number | null;
  rangeMin: number | null;
  rangeMax: number | null;
  confidence: EstimateConfidence;
}

/** Approximate energy density of a kg of body-mass change. A widely used
 * rule of thumb (~3500 kcal/lb), not a precise per-person constant — the
 * uncertainty this introduces is exactly why the result always carries a
 * range and a confidence label rather than a single bare number. */
export const KCAL_PER_KG_BODY_MASS = 7700;

export function computeAdaptiveMaintenance(
  input: AdaptiveMaintenanceInput,
): AdaptiveMaintenanceResult {
  const { avgLoggedKcalPerDay, trendWeightChangeKg, windowDays, reliableDays, weighInDays } =
    input;

  const loggingCompleteness = windowDays > 0 ? reliableDays / windowDays : 0;

  if (windowDays < 10 || reliableDays < 6 || weighInDays < 3) {
    return { maintenanceKcal: null, rangeMin: null, rangeMax: null, confidence: "insufficient_data" };
  }

  const impliedDailySurplus = (trendWeightChangeKg * KCAL_PER_KG_BODY_MASS) / windowDays;
  const maintenanceKcal = avgLoggedKcalPerDay - impliedDailySurplus;

  let confidence: EstimateConfidence = "low";
  let rangeWidth = 350;
  if (windowDays >= 21 && loggingCompleteness >= 0.85 && weighInDays >= 10) {
    confidence = "high";
    rangeWidth = 120;
  } else if (windowDays >= 14 && loggingCompleteness >= 0.6 && weighInDays >= 5) {
    confidence = "medium";
    rangeWidth = 220;
  }

  return {
    maintenanceKcal,
    rangeMin: maintenanceKcal - rangeWidth,
    rangeMax: maintenanceKcal + rangeWidth,
    confidence,
  };
}
