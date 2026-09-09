import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getCurrentGoal, getWeightEntriesSince } from "@/lib/data/nutrition";
import { computeWeightTrend, computeWeeklyRate } from "@/lib/nutrition/trend";
import { formatKg, formatSignedKgPerWeek, formatDateTimeShort } from "@/lib/format";
import { WeightChart } from "@/components/progress/WeightChart";
import { WeightLogForm } from "@/components/progress/WeightLogForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";
import { DeleteWeightButton } from "@/components/progress/DeleteWeightButton";
import { RulerIcon, ImageIcon, ChevronRightIcon } from "@/components/ui/icons";

export default async function ProgresoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const goal = await getCurrentGoal(supabase, user.id);
  const since = new Date();
  since.setDate(since.getDate() - 200);
  const entries = await getWeightEntriesSince(supabase, user.id, since.toISOString());

  const points = computeWeightTrend(entries.map((e) => ({ measuredAt: e.measured_at, weightKg: e.weight_kg })));
  const weeklyRate = computeWeeklyRate(points, {
    targetMinKgPerWeek: goal?.weekly_rate_min_kg ?? undefined,
    targetMaxKgPerWeek: goal?.weekly_rate_max_kg ?? undefined,
  });
  const last = points.at(-1);
  const lastObserved = entries.at(-1);

  return (
    <PageShell title="Progreso">
      <WeightLogForm />

      {points.length === 0 ? (
        <EmptyState title="Todavía no tienes pesajes registrados" />
      ) : (
        <section className="surface-soft flex flex-col gap-1 p-5 pb-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-section">Tendencia de peso</p>
              <p className="text-display mt-1.5 text-[2.25rem]" style={{ color: "var(--metric-weight)" }}>
                {last ? formatKg(last.trendKg) : "—"}
              </p>
            </div>
            <div className="pb-1 text-right">
              <p className="text-metric text-xs text-[var(--text-secondary)]">
                Hoy {lastObserved ? formatKg(lastObserved.weight_kg) : "—"}
              </p>
              <p className="text-metric text-xs text-[var(--text-tertiary)]">
                {weeklyRate.weeklyRateKg != null ? formatSignedKgPerWeek(weeklyRate.weeklyRateKg) : "Sin ritmo aún"}
              </p>
            </div>
          </div>
          <WeightChart points={points} />
        </section>
      )}

      <section className="grid grid-cols-2 gap-2.5">
        <Link href="/progreso/medidas" className="tap-scale surface-soft flex flex-col gap-3 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--metric-fat-soft)", color: "var(--metric-fat)" }}>
            <RulerIcon size={16} />
          </span>
          <span className="flex items-center justify-between text-[13px] font-semibold text-[var(--text-primary)]">
            Medidas corporales <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
          </span>
        </Link>
        <Link href="/progreso/fotos" className="tap-scale surface-soft flex flex-col gap-3 p-4">
          <span className="flex h-8 w-8 items-center justify-center rounded-full" style={{ background: "var(--metric-carbs-soft)", color: "var(--metric-carbs)" }}>
            <ImageIcon size={16} />
          </span>
          <span className="flex items-center justify-between text-[13px] font-semibold text-[var(--text-primary)]">
            Fotos de progreso <ChevronRightIcon size={15} className="text-[var(--text-tertiary)]" />
          </span>
        </Link>
      </section>

      {entries.length > 0 ? (
        <section className="flex flex-col gap-2">
          <SectionHeader>Pesajes recientes</SectionHeader>
          <ul className="flex flex-col divide-y divide-[var(--border-soft)]">
            {[...entries]
              .reverse()
              .slice(0, 10)
              .map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-xs text-[var(--text-tertiary)]">{formatDateTimeShort(e.measured_at)}</span>
                  <span className="text-metric font-semibold text-[var(--text-primary)]">{formatKg(e.weight_kg)}</span>
                  <DeleteWeightButton id={e.id} />
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </PageShell>
  );
}
