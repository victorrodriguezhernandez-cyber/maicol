import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCurrentGoal, getWeightEntriesSince } from "@/lib/data/nutrition";
import { computeWeightTrend, computeWeeklyRate } from "@/lib/nutrition/trend";
import { formatPesaje, formatDateTimeShort, todayLocalDateString } from "@/lib/format";
import { WeightChart } from "@/components/progress/WeightChart";
import { WeightLogForm } from "@/components/progress/WeightLogForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteWeightButton } from "@/components/progress/DeleteWeightButton";
import { RulerIcon, ImageIcon, ChevronRightIcon, ScaleIcon } from "@/components/ui/icons";

export default async function ProgresoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  // Se traen TODOS los pesajes, no los de los últimos N días.
  //
  // Antes se pedían 200, y el selector de la gráfica ofrece "1 año" y
  // "Todo el historial": los dos habrían enseñado 200 días llamándolos
  // otra cosa, sin dar ningún error. Un pesaje es una fila diminuta y
  // aquí hay un solo usuario — pesándose a diario, un año son 365 filas,
  // así que traerlo entero cuesta menos que mantener dos números
  // (el del fetch y el del rango más largo) de acuerdo para siempre.
  const [goal, entries] = await Promise.all([
    getCurrentGoal(supabase, user.id),
    getWeightEntriesSince(supabase, user.id, new Date(0).toISOString()),
  ]);

  const points = computeWeightTrend(entries.map((e) => ({ measuredAt: e.measured_at, weightKg: e.weight_kg })));
  const weeklyRate = computeWeeklyRate(points, {
    targetMinKgPerWeek: goal?.weekly_rate_min_kg ?? undefined,
    targetMaxKgPerWeek: goal?.weekly_rate_max_kg ?? undefined,
  });

  return (
    <div className="flex flex-col gap-5 pb-6">
      <h1 className="text-hero-title text-[1.75rem] text-[var(--text-primary)]">Progreso</h1>

      <section className="surface-hero flex flex-col gap-4 p-5">
        {points.length === 0 ? (
          <EmptyState title="Todavía no tienes pesajes registrados" description="Registra tu primer peso abajo." />
        ) : (
          <WeightChart
            points={points}
            weeklyRateKg={weeklyRate.weeklyRateKg}
            ultimoPesaje={
              entries.length > 0
                ? {
                    weightKg: entries[entries.length - 1].weight_kg,
                    measuredAt: entries[entries.length - 1].measured_at,
                  }
                : null
            }
            hoy={todayLocalDateString()}
          />
        )}
        <WeightLogForm />
      </section>

      <section className="grid grid-cols-2 gap-2.5">
        <Link href="/progreso/medidas" className="tap-scale surface-panel flex flex-col gap-6 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "var(--metric-fat-soft)", color: "var(--metric-fat)" }}>
            <RulerIcon size={17} />
          </span>
          <span className="flex items-center justify-between text-[13px] font-semibold text-[var(--text-primary)]">
            Medidas
            <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
          </span>
        </Link>
        <Link href="/progreso/fotos" className="tap-scale surface-panel flex flex-col gap-6 p-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-full" style={{ background: "var(--metric-carbs-soft)", color: "var(--metric-carbs)" }}>
            <ImageIcon size={17} />
          </span>
          <span className="flex items-center justify-between text-[13px] font-semibold text-[var(--text-primary)]">
            Fotos
            <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
          </span>
        </Link>
      </section>

      {entries.length > 0 ? (
        <section className="flex flex-col gap-1">
          <div className="flex items-center gap-2 pb-1">
            <ScaleIcon size={13} className="text-[var(--text-tertiary)]" />
            <p className="text-section">Pesajes recientes</p>
          </div>
          <div className="surface-panel divide-y divide-[var(--border-soft)] overflow-hidden">
            {[...entries]
              .reverse()
              .slice(0, 8)
              .map((e) => (
                <div key={e.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                  <span className="text-xs text-[var(--text-tertiary)]">{formatDateTimeShort(e.measured_at)}</span>
                  <span className="text-metric font-semibold text-[var(--text-primary)]">{formatPesaje(e.weight_kg)}</span>
                  <DeleteWeightButton id={e.id} />
                </div>
              ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}
