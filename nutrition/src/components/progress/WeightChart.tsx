"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, LineSeries, type IChartApi, type UTCTimestamp } from "lightweight-charts";

export interface WeightChartPoint {
  date: string; // YYYY-MM-DD
  observedKg: number | null;
  trendKg: number;
}

const RANGES = [
  { label: "7D", days: 7 },
  { label: "30D", days: 30 },
  { label: "3M", days: 90 },
  { label: "6M", days: 180 },
  { label: "Todo", days: Infinity },
] as const;

export function WeightChart({ points }: { points: WeightChartPoint[] }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const [rangeDays, setRangeDays] = useState<number>(30);

  const filtered =
    rangeDays === Infinity
      ? points
      : points.slice(Math.max(0, points.length - rangeDays));

  useEffect(() => {
    if (!containerRef.current) return;
    // Read the actual colors from CSS custom properties rather than
    // duplicating hex values here — keeps the chart in sync with the
    // shared metric-weight token (and the light/dark pair) instead of
    // drifting from it.
    const styles = getComputedStyle(document.documentElement);
    const cssVar = (name: string) => styles.getPropertyValue(name).trim();

    const chart = createChart(containerRef.current, {
      height: 260,
      layout: {
        background: { color: "transparent" },
        textColor: cssVar("--text-secondary"),
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: cssVar("--border-soft") },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false },
      handleScroll: false,
      handleScale: false,
    });
    chartRef.current = chart;

    const trendSeries = chart.addSeries(LineSeries, {
      color: cssVar("--metric-weight"),
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: true,
    });
    const observedSeries = chart.addSeries(LineSeries, {
      color: cssVar("--text-tertiary"),
      lineVisible: false,
      pointMarkersVisible: true,
      pointMarkersRadius: 3,
      priceLineVisible: false,
      lastValueVisible: false,
    });

    trendSeries.setData(
      filtered.map((p) => ({ time: (Date.parse(p.date) / 1000) as UTCTimestamp, value: p.trendKg })),
    );
    observedSeries.setData(
      filtered
        .filter((p) => p.observedKg != null)
        .map((p) => ({ time: (Date.parse(p.date) / 1000) as UTCTimestamp, value: p.observedKg! })),
    );
    chart.timeScale().fitContent();

    return () => chart.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeDays, points.length]);

  return (
    <div>
      <div ref={containerRef} className="w-full" />
      <div className="mt-2 flex justify-center gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r.label}
            type="button"
            onClick={() => setRangeDays(r.days)}
            className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${
              rangeDays === r.days
                ? "btn-primary text-[var(--accent-fg)]"
                : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>
    </div>
  );
}
