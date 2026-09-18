import { notFound } from "next/navigation";
import { computeWeightTrend, computeWeeklyRate } from "@/lib/nutrition/trend";
import { WeightChart } from "@/components/progress/WeightChart";
import { formatPesaje } from "@/lib/format";

/**
 * La tarjeta de peso con datos REALES, para poder juzgarla sin entrar a
 * la app (development only, igual que el resto de `/design`).
 *
 * Los pesajes son los del caso que la motivó: 64,0 · 64,1 · 64,35, con
 * ocho días de hueco entre los dos últimos. Ese hueco es justo lo que
 * hace visible si la línea es una curva o dos palos rectos, y el 64,35
 * es el valor que la pantalla redondeaba a "64,4".
 */
export default function DesignProgresoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const entries = [
    { measuredAt: "2026-09-08T03:27:59Z", weightKg: 64.0 },
    { measuredAt: "2026-09-09T01:37:59Z", weightKg: 64.1 },
    { measuredAt: "2026-09-17T08:50:41Z", weightKg: 64.35 },
  ];
  const points = computeWeightTrend(entries);
  const rate = computeWeeklyRate(points);
  const ultimo = entries[entries.length - 1];

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-6 px-4 py-8">
      <h1 className="text-hero-title text-2xl text-[var(--text-primary)]">Progreso — tarjeta de peso</h1>

      <section className="surface-hero flex flex-col gap-4 p-5">
        <WeightChart
          points={points}
          weeklyRateKg={rate.weeklyRateKg}
          ultimoPesaje={{ weightKg: ultimo.weightKg, measuredAt: ultimo.measuredAt }}
          // Fijo, para que la página de diseño enseñe siempre lo mismo
          // en vez de cambiar según el día en que se mire.
          hoy="2026-09-18"
        />
      </section>

      <section className="surface-panel flex flex-col gap-2 p-4">
        <p className="text-section">Los pesajes que entran</p>
        {entries.map((e) => (
          <p key={e.measuredAt} className="text-metric text-sm text-[var(--text-secondary)]">
            {e.measuredAt.slice(8, 10)}/{e.measuredAt.slice(5, 7)} · {formatPesaje(e.weightKg)}
          </p>
        ))}
        <p className="text-[11px] leading-relaxed text-[var(--text-tertiary)]">
          Tendencia final {points.at(-1)!.trendKg.toFixed(4)} kg. El peso subió 0,35 y la tendencia
          0,24: los dos pesajes viejos siguen tirando hacia abajo, que es exactamente para lo que
          sirve.
        </p>
      </section>
    </main>
  );
}
