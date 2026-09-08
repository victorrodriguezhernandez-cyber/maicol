/**
 * Unit conversion helpers. Kept dependency-free and pure so they're trivial
 * to unit test (section 62/63) and safe to reuse from Edge Functions.
 */

export const KG_PER_LB = 0.45359237;
export const ML_PER_FL_OZ = 29.5735;

export function kgToLb(kg: number): number {
  return kg / KG_PER_LB;
}

export function lbToKg(lb: number): number {
  return lb * KG_PER_LB;
}

export function mlToFlOz(ml: number): number {
  return ml / ML_PER_FL_OZ;
}

export function flOzToMl(flOz: number): number {
  return flOz * ML_PER_FL_OZ;
}

/**
 * Rounds only for *display*. Internal math should always work with the
 * unrounded number so repeated scaling (recipe -> serving -> diary) never
 * accumulates rounding error (section 63).
 */
export function roundForDisplay(value: number, decimals = 0): number {
  const factor = 10 ** decimals;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
