"use client";

import { useEffect, useRef, useState } from "react";
import {
  createChart,
  AreaSeries,
  LineSeries,
  LineType,
  CrosshairMode,
  type MouseEventParams,
  type UTCTimestamp,
} from "lightweight-charts";
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
  { label: "1M", days: 30, caption: "Último mes", dentroDe: "el último mes" },
  { label: "3M", days: 90, caption: "Últimos 3 meses", dentroDe: "los últimos 3 meses" },
  { label: "6M", days: 180, caption: "Últimos 6 meses", dentroDe: "los últimos 6 meses" },
  { label: "1A", days: 365, caption: "Último año", dentroDe: "el último año" },
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
  const [rangeLabel, setRangeLabel] = useState<(typeof RANGES)[number]["label"]>("1M");
  const range = RANGES.find((r) => r.label === rangeLabel)!;

  // El día que el dedo está señalando en la gráfica, o null si no señala
  // ninguno. Toda la cabecera de la tarjeta lee de aquí: tocar un día
  // cambia el número grande, la fecha y el pesaje, y al soltar vuelve
  // todo al último día.
  const [tocado, setTocado] = useState<WeightChartPoint | null>(null);

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

  // El día del que habla la cabecera: el que señala el dedo, o el último
  // cuando no hay ninguno.
  const mostrado = tocado ?? last ?? null;

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
        // Muy tenues, sólo para poder seguir un kilo con la vista desde
        // la línea hasta el eje.
        horzLines: { color: conAlfa(cssVar("--border-strong"), 0.45), style: 2 },
      },
      // El eje de kilos estaba APAGADO, así que la gráfica era una línea
      // bonita sin una sola cifra: no se podía saber si subía de 64 a 65
      // o de 64,0 a 64,1, que es justo la diferencia que importa. Con él
      // puesto, se lee un peso sin tener que tocar nada.
      rightPriceScale: {
        visible: true,
        borderVisible: false,
        scaleMargins: { top: 0.22, bottom: 0.18 },
      },
      timeScale: { borderVisible: false, secondsVisible: false },
      // Magnet: la cruz se engancha al valor de la serie en vez de
      // quedarse donde cayó el dedo, que en un móvil nunca es donde
      // apuntabas.
      crosshair: {
        mode: CrosshairMode.Magnet,
        vertLine: { color: cssVar("--border-strong"), width: 1, style: 2, labelVisible: true },
        horzLine: { color: cssVar("--border-strong"), width: 1, style: 2, labelVisible: true },
      },
      // Pinned explicitly: the library formats tick labels via
      // Date.toLocaleString(locale) and defaults to the browser's own
      // locale string, which throws (RangeError) on a malformed one —
      // crashing the whole draw call and leaving the canvas blank.
      // Never depend on the host's locale for something this visible.
      localization: {
        locale: "es-ES",
        // El eje y la etiqueta de la cruz enseñan "64,2", no "64.20":
        // un decimal, que es la precisión que tiene la tendencia, y con
        // coma, que es como se escribe un número aquí.
        priceFormatter: (precio: number) =>
          precio.toLocaleString("es-ES", { minimumFractionDigits: 1, maximumFractionDigits: 1 }),
      },
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

    // ── Tocar la gráfica ──────────────────────────────────────────────
    //
    // Antes no pasaba nada al tocar, y por dos motivos a la vez: la cruz
    // estaba desactivada, y NADIE escuchaba el evento. Encima, en un
    // móvil la librería sólo entra en modo lectura con una pulsación
    // LARGA (`_internal_longTapEvent`), así que un toque normal no
    // llegaba a mover nada aunque la cruz hubiera estado encendida.
    //
    // Por eso se escuchan las dos cosas: el movimiento de la cruz (la
    // pulsación larga arrastrando, y el ratón en un ordenador) y el
    // toque suelto. Un toque normal ya deja el día fijado.
    const porFecha = new Map(filtered.map((p) => [Date.parse(p.date) / 1000, p]));
    const puntoDe = (param: MouseEventParams) => {
      const instante = param.time as number | undefined;
      return instante == null ? null : porFecha.get(instante) ?? null;
    };

    // Arrastrando con el dedo (o con el ratón en un ordenador) la cruz la
    // dibuja la librería; aquí sólo se lee dónde está.
    const alMover = (param: MouseEventParams) => setTocado(puntoDe(param));

    // Un toque suelto, en cambio, NO dibuja nada: la librería sólo entra
    // en modo lectura con una pulsación larga. Así que en el toque se
    // pinta la cruz a mano, o el número de arriba cambiaría sin que nada
    // en la gráfica dijera de qué día está hablando.
    const alTocar = (param: MouseEventParams) => {
      const punto = puntoDe(param);
      setTocado(punto);
      if (punto) chart.setCrosshairPosition(punto.trendKg, param.time!, areaSeries);
      else chart.clearCrosshairPosition();
    };

    chart.subscribeCrosshairMove(alMover);
    chart.subscribeClick(alTocar);

    return () => {
      chart.unsubscribeCrosshairMove(alMover);
      chart.unsubscribeClick(alTocar);
      chart.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rangeLabel, points.length, hoy]);

  // Al cambiar de rango, el día señalado puede no estar ya en el nuevo,
  // así que se suelta al cambiar y no en un efecto posterior.
  function cambiarRango(etiqueta: (typeof RANGES)[number]["label"]) {
    setTocado(null);
    setRangeLabel(etiqueta);
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between">
        <p className="text-section">Tendencia de peso</p>
        <p className="text-[11px] text-[var(--text-tertiary)]">
          {/* La fecha sólo mientras el dedo señala un día. Sin dedo, aquí
              va el rango: es lo que dice qué estás mirando. */}
          {tocado ? formatDateShort(`${tocado.date}T12:00:00Z`) : range.caption}
        </p>
      </div>

      <div className="flex items-end justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-display text-[2.35rem]" style={{ color: "var(--metric-weight)" }}>
            {mostrado ? formatKg(mostrado.trendKg).replace(" kg", "") : "—"}
          </span>
          <span className="text-sm font-medium text-[var(--text-secondary)]">kg</span>
        </div>
        {/* Mientras el dedo señala un día, el delta del rango entero no
            viene a cuento: lo que se está mirando es ESE día. */}
        {tocado ? null : deltaKg != null && Math.round(Math.abs(deltaKg) * 10) > 0 ? (
          <p className="pb-1.5 text-xs font-semibold" style={{ color: deltaKg <= 0 ? "var(--success)" : "var(--warning)" }}>
            {deltaKg <= 0 ? "↓" : "↑"} {formatKg(Math.abs(deltaKg))} de tendencia
          </p>
        ) : weeklyRateKg != null ? (
          <p className="pb-1.5 text-xs font-medium text-[var(--text-tertiary)]">{formatSignedKgPerWeek(weeklyRateKg)}</p>
        ) : null}
      </div>

      {/* La lectura real de la báscula, con su fecha: es el número que
          escribiste tú, y sin él la tarjeta entera habla de una cifra que
          no has visto nunca. Con el dedo encima pasa a ser el pesaje de
          ESE día — o dice que ese día no te pesaste, que también es un
          dato: la línea de la tendencia sigue existiendo ahí. */}
      {tocado ? (
        <p className="-mt-1.5 text-[11.5px] text-[var(--text-tertiary)]">
          {tocado.observedKg != null ? (
            <>
              Ese día la báscula marcó{" "}
              <span className="text-metric font-semibold text-[var(--text-secondary)]">
                {formatPesaje(tocado.observedKg)}
              </span>
            </>
          ) : (
            "Ese día no te pesaste: el número de arriba es la tendencia que venía de antes."
          )}
        </p>
      ) : ultimoPesaje ? (
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
          <span className="font-semibold text-[var(--text-secondary)]">Los puntos grises</span> son lo
          que marcó la báscula cada día que te pesaste.{" "}
          <span className="font-semibold text-[var(--text-secondary)]">La línea</span> es la
          tendencia: esos mismos pesajes sin el agua y la comida de cada día.
          {last ? (
            <>
              {" "}
              Los <span className="font-semibold text-[var(--text-secondary)]">
                {formatKg(last.trendKg).replace(" kg", "")} kg
              </span>{" "}
              de arriba son esa tendencia hoy — no lo que marcaría la báscula si te subieras ahora,
              sino el peso en el que de verdad estás.
            </>
          ) : null}{" "}
          Es el número que hay que mirar: un pesaje suelto se mueve medio kilo por haber bebido o
          cenado, y la tendencia no.{" "}
          <span className="font-semibold text-[var(--text-secondary)]">
            Toca cualquier punto de la gráfica
          </span>{" "}
          para ver ese día, o mantén el dedo y arrastra para recorrerlos.
        </p>
      )}

      <div className="flex justify-center">
        <SegmentedControl
          options={RANGES.map((r) => ({ value: r.label, label: r.label }))}
          value={rangeLabel}
          onChange={cambiarRango}
        />
      </div>
    </div>
  );
}
