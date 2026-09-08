import { computeAdaptiveMaintenance, KCAL_PER_KG_BODY_MASS, type EstimateConfidence } from "./tdee";

export interface AdaptiveGoalCheckInput {
  currentGoalKcal: number;
  weeklyRateMinKg: number | null;
  weeklyRateMaxKg: number | null;
  actualWeeklyRateKg: number | null;
  avgLoggedKcalPerDay: number;
  trendWeightChangeKg: number;
  windowDays: number;
  reliableDays: number;
  weighInDays: number;
}

export interface AdaptiveGoalSuggestion {
  hasSuggestion: boolean;
  confidence: EstimateConfidence;
  maintenanceEstimate: ReturnType<typeof computeAdaptiveMaintenance>;
  suggestedKcal: number | null;
  deltaKcal: number | null;
  reason: string;
}

/**
 * Section 27: proposes (never applies) a conservative calorie adjustment
 * once there's enough reliable data — small, gradual changes only, and
 * "not enough data yet" beats a confident-sounding guess (section 28).
 */
export function checkAdaptiveGoal(input: AdaptiveGoalCheckInput): AdaptiveGoalSuggestion {
  const maintenanceEstimate = computeAdaptiveMaintenance({
    avgLoggedKcalPerDay: input.avgLoggedKcalPerDay,
    trendWeightChangeKg: input.trendWeightChangeKg,
    windowDays: input.windowDays,
    reliableDays: input.reliableDays,
    weighInDays: input.weighInDays,
  });

  if (maintenanceEstimate.confidence === "insufficient_data" || input.actualWeeklyRateKg == null) {
    return {
      hasSuggestion: false,
      confidence: "insufficient_data",
      maintenanceEstimate,
      suggestedKcal: null,
      deltaKcal: null,
      reason: "Todavía no hay suficientes datos para proponer un ajuste.",
    };
  }

  if (input.weeklyRateMinKg == null || input.weeklyRateMaxKg == null) {
    return {
      hasSuggestion: false,
      confidence: maintenanceEstimate.confidence,
      maintenanceEstimate,
      suggestedKcal: null,
      deltaKcal: null,
      reason: "El objetivo actual es de mantenimiento; no se proponen ajustes automáticos.",
    };
  }

  const targetMid = (input.weeklyRateMinKg + input.weeklyRateMaxKg) / 2;
  const inRange =
    input.actualWeeklyRateKg >= input.weeklyRateMinKg && input.actualWeeklyRateKg <= input.weeklyRateMaxKg;

  if (inRange) {
    return {
      hasSuggestion: false,
      confidence: maintenanceEstimate.confidence,
      maintenanceEstimate,
      suggestedKcal: null,
      deltaKcal: null,
      reason: "Tu ritmo actual ya está dentro del objetivo.",
    };
  }

  const deltaKcal = Math.round(((targetMid - input.actualWeeklyRateKg) * KCAL_PER_KG_BODY_MASS) / 7 / 25) * 25;

  // Conservative: ignore trivially small suggested changes.
  if (Math.abs(deltaKcal) < 50) {
    return {
      hasSuggestion: false,
      confidence: maintenanceEstimate.confidence,
      maintenanceEstimate,
      suggestedKcal: null,
      deltaKcal: null,
      reason: "El ajuste calculado es demasiado pequeño para justificar un cambio.",
    };
  }

  const suggestedKcal = Math.round((input.currentGoalKcal + deltaKcal) / 25) * 25;

  return {
    hasSuggestion: true,
    confidence: maintenanceEstimate.confidence,
    maintenanceEstimate,
    suggestedKcal,
    deltaKcal,
    reason:
      deltaKcal > 0
        ? "Tu tendencia va por debajo del objetivo de ganancia."
        : "Tu tendencia va por encima del objetivo de ganancia.",
  };
}
