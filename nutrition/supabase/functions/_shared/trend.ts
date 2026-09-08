// Minimal duplicate of src/lib/nutrition/trend.ts's algorithm for use
// inside the (separately deployed, Deno-runtime) ai-coach function. Kept
// intentionally tiny — see that file for the full documentation of why a
// time-aware EWMA is used instead of a naive day-over-day delta.
const TAU_DAYS = 7;

export interface Observation {
  measuredAt: string;
  weightKg: number;
}

export function computeTrend(observations: Observation[]): { date: string; trendKg: number }[] {
  if (observations.length === 0) return [];
  const byDay = new Map<string, number[]>();
  for (const o of observations) {
    const key = o.measuredAt.slice(0, 10);
    const list = byDay.get(key) ?? [];
    list.push(o.weightKg);
    byDay.set(key, list);
  }
  const days = [...byDay.keys()].sort();
  const points: { date: string; trendKg: number }[] = [];
  let trend = avg(byDay.get(days[0])!);
  let lastDay = days[0];
  for (const day of days) {
    const observed = avg(byDay.get(day)!);
    const dt = Math.max((Date.parse(day) - Date.parse(lastDay)) / 86_400_000, 0);
    const alpha = 1 - Math.exp(-dt / TAU_DAYS);
    trend = trend + alpha * (observed - trend);
    points.push({ date: day, trendKg: trend });
    lastDay = day;
  }
  return points;
}

function avg(values: number[]): number {
  return values.reduce((a, b) => a + b, 0) / values.length;
}

export function weeklyRate(points: { date: string; trendKg: number }[], windowDays = 14): number | null {
  if (points.length < 4) return null;
  const last = points[points.length - 1].date;
  const start = new Date(last);
  start.setUTCDate(start.getUTCDate() - windowDays);
  const startIso = start.toISOString().slice(0, 10);
  const window = points.filter((p) => p.date >= startIso);
  if (window.length < 4) return null;
  const xs = window.map((p) => (Date.parse(p.date) - Date.parse(window[0].date)) / 86_400_000);
  const ys = window.map((p) => p.trendKg);
  const n = xs.length;
  const mx = xs.reduce((a, b) => a + b, 0) / n;
  const my = ys.reduce((a, b) => a + b, 0) / n;
  let num = 0;
  let den = 0;
  for (let i = 0; i < n; i++) {
    num += (xs[i] - mx) * (ys[i] - my);
    den += (xs[i] - mx) ** 2;
  }
  return den === 0 ? 0 : (num / den) * 7;
}
