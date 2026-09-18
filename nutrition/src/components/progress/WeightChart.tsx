"use client";

import { useEffect, useRef, useState } from "react";
import { createChart, AreaSeries, LineSeries, LineType, type UTCTimestamp } from "lightweight-charts";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { formatKg, formatPesaje, formatSignedKgPerWeek, formatDateShort } from "@/lib/format";

export interface WeightChartPoint {
  date: string; // YYYY-MM-DD
  observedKg: number | null;
  trendKg: number;
}

const RANGES = [
  // `caption` va suelto arriba a la derecha; `dentroDe` va dentro de una
  // frase ("ningún pesaje EN los últimos 7 días"), y por eso se escribe
  // aparte en vez de sacarlo del otro poniéndolo en minúsculas: eso daba
  // "en últimos 7 días", sin artículo.
  { label: "7D", days: 7, caption: "Últimos 7 días", dentroDe: "los últimos 7 días" },
  { label: "30D", days: 30, caption: "Últimos 30 días", dentroDe: "los últimos 30 días" },
  { label: "3M", days: 90, caption: "Últimos 3 meses", dentroDe: "los últimos 3 meses" },
  { label: "6M", days: 180, caption: "Últimos 6 meses", dentroDe: "los últimos 6 meses" },
  { label: "Todo", days: Infinity, caption: "Todo el historial", dentroDe: "todo tu historial" },
] as const;

/** Días completos entre dos fechas YYYY-MM-DD. */
function diasEntre(desde: string, hasta: string): number {
  return Math.round((Date.parse(hasta) - Date.parse(desde)) / 86_400_000);
}

/**
 * `#rrggbb` → `rgba(r, g, b, a)`.
 *
 * El relleno del área va a un `<canvas>`, no a CSS, y antes se escribía
 * con `color-mix(...)`. Chrome lo acepta, pero el parser de color del
 * canvas no es el mismo en todos los navegadores y cuando rechaza un
 * valor NO lanza error: se queda con el color anterior. O sea que en un
 * navegador que no lo entienda el degradado desaparece y nadie se entera
 * — y esta app se usa en Safari de iOS. `rgba()` lo entiende todo.
 */
function conAlfa(hex: string, alfa: number): string {
  const limpio = hex.trim();
  const corto = /^#([0-9a-f])([0-9a-f])([0-9a-f])$/i.exec(limpio);
  const largo = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(limpio);
  if (!corto && !largo) return limpio; // ya viene en otro formato: no tocar
  const [r, g, b] = corto
    ? corto.slice(1).map((c) => parseInt(c + c, 16))
    : largo!.slice(1).map((c) => parseInt(c, 16));
  return `rgba(${r}, ${g}, ${b}, ${alfa})`;
}

/**
 * The whole "tendencia de peso" card: big trend number + delta-since,
 * the chart itself, and the range switcher — one self-contained unit
 * (not split between this and the page) so the header caption and the
 * delta figure always agree with whatever range is actually plotted.
 *
 * ── Por qué se enseñan DOS números y no uno ─────────────────────────────
 *
 * El número grande es la TENDENCIA, no lo que marcó la báscula, y la
 * diferencia entre los dos confunde si la pantalla no la nombra: con
 * pesajes de 64,0 · 64,1 · 64,35 la tendencia vale 64,24 y su subida es
 * de 0,2 kg, mientras que el peso subió 0,35. Las dos cifras son
 * correctas y dicen cosas distintas — el peso de un día lleva encima el
 * agua y la comida de ese día; la tendencia es lo que queda al quitar
 * ese ruido —, así que la tarjeta enseña las dos, cada una con su
 * nombre, en vez de enseñar una y que parezca un error de cálculo
 * (regla 9: una cifra que no se puede explicar no debería estar ahí).
 */
export function WeightChart({
  points,
  weeklyRateKg,
  ultimoPesaje,
  hoy,
}: {
  points: WeightChartPoint[];
  weeklyRateKg: number | null;
  /** La última lectura de la báscula, sin suavizar. */
  ultimoPesaje?: { weightKg: number; measuredAt: string } | null;
  /**
   * Hoy (YYYY-MM-DD) en la zona de la app. Viene del servidor a
   * propósito: calcularlo aquí con `new Date()` daría un valor distinto
   * en el render del servidor y en el del cliente si el usuario abre la
   * app justo al pasar la medianoche.
   */
  hoy: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [rangeLabel, setRangeLabel] = useState<(typeof RANGES)[number]["label"]>("30D");
  const range = RANGES.find((r) => r.label === rangeLabel)!;

  // Se recorta por FECHA, no por número de puntos.
  //
  // `computeWeightTrend` devuelve un punto por día CON PESAJE, no uno por
  // día del calendario. Cortando con `slice(length - 7)` se cogían "los
  // últimos 7 pesajes", así que con pesajes espaciados —el 8, el 9 y el
  // 17— "Últimos 7 días" enseñaba nueve días y el delta se calculaba
  // desde una fecha que no estaba en el rango. La etiqueta prometía una
  // cosa y el gráfico enseñaba otra.
  const filtered =
    range.days === Infinity
      ? points
      : points.filter((p) => diasEntre(p.date, hoy) < range.days);

  // Con menos de dos puntos no hay línea que dibujar: uno solo sale como
  // un muñón horizontal flotando a un lado, que parece un fallo de
  // pintado y además insinúa una tendencia plana que nadie ha medido.
  const sinLinea = filtered.length < 2;
  const last = filtered.at(-1);
  const first = filtered[0];
  const deltaKg = last && first ? last.trendKg - first.trendKg : null;

  useEffect(() => {
    if (!containerRef.current || sinLinea) return;
    const styles = getComputedStyle(document.documentElement);
    const cssVar = (name: string) => styles.getPropertyValue(name).trim();
    const accentRgb = cssVar("--metric-weight");

    const chart = createChart(containerRef.current, {
      height: 172,
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
      lineWidth: 3,
      // Curva y no tramos rectos. El peso no da saltos en línea recta de
      // un pesaje al siguiente: entre el 9 y el 17 pasaron ocho días y
      // la tendencia los recorrió poco a poco. Una polilínea dibuja esos
      // ocho días como un palo con un vértice duro justo donde hubo un
      // dato, que es donde MENOS pasó de golpe.
      lineType: LineType.Curved,
      topColor: conAlfa(accentRgb, 0.34),
      bottomColor: conAlfa(accentRgb, 0),
      priceLineVisible: false,
      lastValueVisible: false,
    });
    const observedSeries = chart.addSeries(LineSeries, {
      // Los pesajes de verdad. Iban en `--text-tertiary`, que sobre el
      // fondo oscuro de la tarjeta es casi invisible: son TUS datos, los
      // únicos que has medido, y quedaban peor vistos que la línea
      // calculada a partir de ellos.
      color: cssVar("--text-secondary"),
      lineVisible: false,
      pointMarkersVisible: true,
      pointMarkersRadius: 4,
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

    // Aire arriba y abajo: sin esto la línea se pega a los bordes y los
    // puntos de los extremos se cortan por la mitad.
    areaSeries.priceScale().applyOptions({ scaleMargins: { top: 0.22, bottom: 0.18 } });

    chart.timeScale().fitContent();

    return () => chart.remove();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeLabel, points.length, hoy]);

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
            {deltaKg <= 0 ? "↓" : "↑"} {formatKg(Math.abs(deltaKg))} de tendencia
          </p>
        ) : weeklyRateKg != null ? (
          <p className="pb-1.5 text-xs font-medium text-[var(--text-tertiary)]">{formatSignedKgPerWeek(weeklyRateKg)}</p>
        ) : null}
      </div>

      {/* La lectura real de la báscula, al lado de la tendencia y con su
          fecha: es el número que el usuario escribió, y sin él la tarjeta
          entera habla de una cifra que él no ha visto nunca. */}
      {ultimoPesaje ? (
        <p className="-mt-1.5 text-[11.5px] text-[var(--text-tertiary)]">
          Último pesaje{" "}
          <span className="text-metric font-semibold text-[var(--text-secondary)]">
            {formatPesaje(ultimoPesaje.weightKg)}
          </span>{" "}
          el {formatDateShort(ultimoPesaje.measuredAt)}
        </p>
      ) : null}

      {/* autoSize sizes the chart to this element's own CSS box — it MUST
          have an explicit height or the chart renders at 0px and is
          invisible (a real bug this had: only width was set). */}
      {sinLinea ? (
        <div className="flex h-[172px] flex-col items-center justify-center gap-1.5 px-6 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            {filtered.length === 0
              ? `Ningún pesaje en ${range.dentroDe}.`
              : `Sólo un pesaje en ${range.dentroDe}.`}
          </p>
          <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
            {filtered.length === 0
              ? "Elige un rango más amplio para ver la tendencia que ya tienes."
              : "Hacen falta dos para que haya una tendencia que dibujar. Elige un rango más amplio o vuelve a pesarte."}
          </p>
        </div>
      ) : (
        <div ref={containerRef} className="-mx-1 h-[172px] w-[calc(100%+0.5rem)]" />
      )}

      {sinLinea ? null : (
        <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          La línea es la tendencia, no cada pesaje: los puntos grises son lo que marcó la báscula y la
        línea es lo que queda al quitarles el agua y la comida de cada día. Por eso sube más despacio
        que un pesaje suelto — y por eso sirve para saber si de verdad estás ganando.
        </p>
      )}

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
