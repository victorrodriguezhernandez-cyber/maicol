"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, AreaSeries, LineSeries, type UTCTimestamp } from "lightweight-charts";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatKg, formatSignedKgPerWeek } from "@/lib/format";

export interface WeightChartPoint {
  date: string; // YYYY-MM-DD
  observedKg: number | null;
  trendKg: number;
}

const RANGES = [
  { label: "7D", days: 7, caption: "Últimos 7 días" },
  { label: "30D", days: 30, caption: "Últimos 30 días" },
  { label: "3M", days: 90, caption: "Últimos 3 meses" },
  { label: "6M", days: 180, caption: "Últimos 6 meses" },
  { label: "Todo", days: Infinity, caption: "Todo el historial" },
] as const;

/**
 * The whole "tendencia de peso" card: big trend number + delta-since,
 * the chart itself, and the range switcher — one self-contained unit
 * (not split between this and the page) so the header caption and the
 * delta figure always agree with whatever range is actually plotted.
 */
export function WeightChart({ points, weeklyRateKg }: { points: WeightChartPoint[]; weeklyRateKg: number | null }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rangeLabel, setRangeLabel] = useState<(typeof RANGES)[number]["label"]>("30D");
  const range = RANGES.find((r) => r.label === rangeLabel)!;

  const filtered = range.days === Infinity ? points : points.slice(Math.max(0, points.length - range.days));
  const last = filtered.at(-1);
  const first = filtered[0];
  const deltaKg = last && first ? last.trendKg - first.trendKg : null;

  useEffect(() => {
    if (!containerRef.current) return;
    const styles = getComputedStyle(document.documentElement);
    const cssVar = (name: string) => styles.getPropertyValue(name).trim();
    const accentRgb = cssVar("--metric-weight");

    const chart = createChart(containerRef.current, {
      height: 152,
      autoSize: true,
      layout: {
        background: { color: "transparent" },
        textColor: cssVar("--text-tertiary"),
        fontSize: 10,
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { visible: false },
      },
      rightPriceScale: { visible: false },
      timeScale: { borderVisible: false, secondsVisible: false },
      crosshair: { horzLine: { visible: false }, vertLine: { labelVisible: false } },
      // Pinned explicitly: the library formats tick labels via
      // Date.toLocaleString(locale) and defaults to the browser's own
      // locale string, which throws (RangeError) on a malformed one —
      // crashing the whole draw call and leaving the canvas blank.
      // Never depend on the host's locale for something this visible.
      localization: { locale: "es-ES" },
      handleScroll: false,
      handleScale: false,
    });

    const areaSeries = chart.addSeries(AreaSeries, {
      lineColor: accentRgb,
      lineWidth: 2,
      topColor: `color-mix(in srgb, ${accentRgb} 28%, transparent)`,
      bottomColor: `color-mix(in srgb, ${accentRgb} 0%, transparent)`,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const observedSeries = chart.addSeries(LineSeries, {
      color: cssVar("--text-tertiary"),
      lineVisible: false,
      pointMarkersVisible: true,
      pointMarkersRadius: 2.5,
      priceLineVisible: false,
      lastValueVisible: false,
      crosshairMarkerVisible: false,
    });

    areaSeries.setData(
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
  }, [rangeLabel, points.length]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-section">Tendencia de peso</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">{range.caption}</p>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-display text-[2.35rem]" style={{ color: "var(--metric-weight)" }}>
            {last ? formatKg(last.trendKg).replace(" kg", "") : "—"}
          </span>
          <span className="text-sm font-medium text-[var(--text-secondary)]">kg</span>
        </div>
        {deltaKg != null && Math.round(Math.abs(deltaKg) * 10) > 0 ? (
          <p className="pb-1.5 text-xs font-semibold" style={{ color: deltaKg <= 0 ? "var(--success)" : "var(--warning)" }}>
            {deltaKg <= 0 ? "↓" : "↑"} {formatKg(Math.abs(deltaKg))} en este rango
          </p>
        ) : weeklyRateKg != null ? (
          <p className="pb-1.5 text-xs font-medium text-[var(--text-tertiary)]">{formatSignedKgPerWeek(weeklyRateKg)}</p>
        ) : null}
      </div>

      {/* autoSize sizes the chart to this element's own CSS box — it MUST
          have an explicit height or the chart renders at 0px and is
          invisible (a real bug this had: only width was set). */}
      <div ref={containerRef} className="-mx-1 h-[152px] w-[calc(100%+0.5rem)]" />

      <div className="flex justify-center">
        <SegmentedControl
          options={RANGES.map((r) => ({ value: r.label, label: r.label }))}
          value={rangeLabel}
          onChange={setRangeLabel}
        />
      </div>
    </div>
  );
}
