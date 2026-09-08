/**
 * Weight trend algorithm (section 23).
 *
 * The naive "today - yesterday" delta is never used. Instead we keep a
 * continuous-time exponentially weighted moving average (EWMA) of the
 * *trend* weight, updated every time a real weigh-in arrives:
 *
 *   trend(t) = trend(t-1) + (1 - e^(-Δdays / TAU)) * (observed(t) - trend(t-1))
 *
 * Using elapsed *time* rather than a fixed per-entry alpha is what makes
 * this correct for irregular weigh-ins (daily, or every 2-4 days per
 * section 21/53): a gap of 4 days pulls the trend most of the way toward
 * the new observation, a gap of 1 day only a little, exactly like a
 * continuous low-pass filter. This is the same family of algorithm used
 * by Hacker's Diet / Trendweight / MacroFactor (a discrete EWMA is just
 * the special case of this with fixed Δdays = 1).
 *
 * TAU_DAYS is the filter's time constant: after TAU_DAYS the trend has
 * closed ~63% of the gap to a step change in true body weight. We use 7
 * days — short enough to react within one training week, long enough to
 * ignore day-to-day water/sodium/glycogen noise.
 *
 * The weekly rate of change is then estimated with an ordinary
 * least-squares regression of the trend line over a trailing window
 * (default 14 days), which is far more robust to a single noisy weigh-in
 * than comparing two individual points.
 */

export const TAU_DAYS = 7;
export const DEFAULT_REGRESSION_WINDOW_DAYS = 14;

export interface WeightObservation {
  /** ISO timestamp of the weigh-in. */
  measuredAt: string;
  weightKg: number;
}

export interface TrendPoint {
  /** Calendar day (YYYY-MM-DD, UTC) this point represents. */
  date: string;
  /** Average of real weigh-ins on this day, or null if none. */
  observedKg: number | null;
  trendKg: number;
}

function toDayKey(iso: string): string {
  return iso.slice(0, 10);
}

function daysBetween(a: string, b: string): number {
  const msPerDay = 24 * 60 * 60 * 1000;
  return (Date.parse(b) - Date.parse(a)) / msPerDay;
}

/**
 * Builds the daily trend series from raw weigh-ins. Days with more than
 * one weigh-in are averaged into a single observation for that day before
 * being fed to the filter, so multiple same-day weigh-ins don't
 * over-weight that day.
 */
export function computeWeightTrend(
  observations: WeightObservation[],
  tauDays = TAU_DAYS,
): TrendPoint[] {
  if (observations.length === 0) return [];

  const byDay = new Map<string, number[]>();
  for (const obs of observations) {
    const key = toDayKey(obs.measuredAt);
    const list = byDay.get(key) ?? [];
    list.push(obs.weightKg);
    byDay.set(key, list);
  }

  const days = [...byDay.keys()].sort();
  const points: TrendPoint[] = [];

  let trend = byDay.get(days[0])!.reduce((a, b) => a + b, 0) / byDay.get(days[0])!.length;
  let lastDay = days[0];

  for (const day of days) {
    const values = byDay.get(day)!;
    const observedKg = values.reduce((a, b) => a + b, 0) / values.length;
    const dt = Math.max(daysBetween(lastDay, day), 0);
    const alpha = 1 - Math.exp(-dt / tauDays);
    trend = trend + alpha * (observedKg - trend);
    points.push({ date: day, observedKg, trendKg: trend });
    lastDay = day;
  }

  return points;
}

export type WeeklyRateStatus =
  | "insufficient_data"
  | "below_target"
  | "on_target"
  | "above_target";

export interface WeeklyRateResult {
  status: WeeklyRateStatus;
  weeklyRateKg: number | null;
}

/**
 * Ordinary least-squares slope of the trend line's trailing window,
 * expressed in kg/week. Returns null (insufficient_data) when fewer than
 * `minPoints` distinct days are available or the window spans too few
 * days to be meaningful — a fabricated trend is worse than none
 * (section 28: "Todavía no hay suficientes datos").
 */
export function computeWeeklyRate(
  points: TrendPoint[],
  {
    windowDays = DEFAULT_REGRESSION_WINDOW_DAYS,
    minPoints = 4,
    minSpanDays = 6,
    targetMinKgPerWeek,
    targetMaxKgPerWeek,
  }: {
    windowDays?: number;
    minPoints?: number;
    minSpanDays?: number;
    targetMinKgPerWeek?: number;
    targetMaxKgPerWeek?: number;
  } = {},
): WeeklyRateResult {
  if (points.length < minPoints) {
    return { status: "insufficient_data", weeklyRateKg: null };
  }

  const lastDate = points[points.length - 1].date;
  const windowStart = new Date(lastDate);
  windowStart.setUTCDate(windowStart.getUTCDate() - windowDays);
  const windowStartIso = windowStart.toISOString().slice(0, 10);

  const window = points.filter((p) => p.date >= windowStartIso);
  if (window.length < minPoints) {
    return { status: "insufficient_data", weeklyRateKg: null };
  }

  const spanDays = daysBetween(window[0].date, window[window.length - 1].date);
  if (spanDays < minSpanDays) {
    return { status: "insufficient_data", weeklyRateKg: null };
  }

  // OLS slope of trendKg against day-offset.
  const xs = window.map((p) => daysBetween(window[0].date, p.date));
  const ys = window.map((p) => p.trendKg);
  const n = xs.length;
  const meanX = xs.reduce((a, b) => a + b, 0) / n;
  const meanY = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - meanX) * (ys[i] - meanY);
    den += (xs[i] - meanX) ** 2;
  }
  const slopePerDay = den === 0 ? 0 : num / den;
  const weeklyRateKg = slopePerDay * 7;

  let status: WeeklyRateStatus = "on_target";
  if (targetMinKgPerWeek != null && weeklyRateKg < targetMinKgPerWeek) {
    status = "below_target";
  } else if (targetMaxKgPerWeek != null && weeklyRateKg > targetMaxKgPerWeek) {
    status = "above_target";
  }

  return { status, weeklyRateKg };
}
