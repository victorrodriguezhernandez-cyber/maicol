import { describe, expect, it } from "vitest";
import { computeWeightTrend, computeWeeklyRate } from "./trend";

function isoDate(daysFromEpoch: number): string {
  const d = new Date("2026-01-01T08:00:00Z");
  d.setUTCDate(d.getUTCDate() + daysFromEpoch);
  return d.toISOString();
}

describe("computeWeightTrend", () => {
  it("never equals a naive today-minus-yesterday delta when weight jumps", () => {
    // A one-day spike (e.g. high sodium meal) should barely move the trend.
    const observations = [
      { measuredAt: isoDate(0), weightKg: 80 },
      { measuredAt: isoDate(1), weightKg: 80.1 },
      { measuredAt: isoDate(2), weightKg: 82 }, // spike
      { measuredAt: isoDate(3), weightKg: 80.2 },
    ];
    const points = computeWeightTrend(observations);
    const spikeDay = points[2];
    const dayAfter = points[3];
    // Trend should have moved only a fraction of the 1.9kg spike, not all of it.
    expect(spikeDay.trendKg).toBeLessThan(81);
    expect(spikeDay.trendKg).toBeGreaterThan(80);
    // And the naive delta (82 - 80.1 = 1.9) is NOT what we report as trend change.
    expect(Math.abs(dayAfter.trendKg - spikeDay.trendKg)).toBeLessThan(1.9);
  });

  it("converges toward a sustained new weight over time", () => {
    const observations = Array.from({ length: 30 }, (_, i) => ({
      measuredAt: isoDate(i),
      weightKg: 85, // constant true weight from day 0
    }));
    const points = computeWeightTrend(observations);
    expect(points[points.length - 1].trendKg).toBeCloseTo(85, 5);
  });

  it("averages multiple same-day weigh-ins into one observation", () => {
    const observations = [
      { measuredAt: "2026-01-01T07:00:00Z", weightKg: 80 },
      { measuredAt: "2026-01-01T20:00:00Z", weightKg: 82 },
    ];
    const points = computeWeightTrend(observations);
    expect(points).toHaveLength(1);
    expect(points[0].observedKg).toBe(81);
  });

  it("handles irregular gaps (every 3-4 days) without erroring", () => {
    const observations = [
      { measuredAt: isoDate(0), weightKg: 80 },
      { measuredAt: isoDate(4), weightKg: 80.3 },
      { measuredAt: isoDate(9), weightKg: 80.6 },
    ];
    const points = computeWeightTrend(observations);
    expect(points).toHaveLength(3);
    expect(points[2].trendKg).toBeGreaterThan(points[0].trendKg);
  });
});

describe("computeWeeklyRate", () => {
  it("reports insufficient_data with too few points", () => {
    const points = computeWeightTrend([
      { measuredAt: isoDate(0), weightKg: 80 },
      { measuredAt: isoDate(1), weightKg: 80.1 },
    ]);
    const result = computeWeeklyRate(points);
    expect(result.status).toBe("insufficient_data");
    expect(result.weeklyRateKg).toBeNull();
  });

  it("recovers a known linear gain rate via OLS", () => {
    // True gain of exactly 0.3 kg/week => ~0.042857 kg/day
    const dailyGain = 0.3 / 7;
    const observations = Array.from({ length: 21 }, (_, i) => ({
      measuredAt: isoDate(i),
      weightKg: 80 + dailyGain * i,
    }));
    const points = computeWeightTrend(observations, 3); // fast tau to track the ramp closely
    const result = computeWeeklyRate(points, { windowDays: 14 });
    expect(result.status).not.toBe("insufficient_data");
    expect(result.weeklyRateKg).toBeCloseTo(0.3, 1);
  });

  it("classifies against a target range", () => {
    const dailyGain = 0.05 / 7; // far below a 0.2-0.3 target
    const observations = Array.from({ length: 21 }, (_, i) => ({
      measuredAt: isoDate(i),
      weightKg: 80 + dailyGain * i,
    }));
    const points = computeWeightTrend(observations, 3);
    const result = computeWeeklyRate(points, {
      windowDays: 14,
      targetMinKgPerWeek: 0.2,
      targetMaxKgPerWeek: 0.3,
    });
    expect(result.status).toBe("below_target");
  });
});
