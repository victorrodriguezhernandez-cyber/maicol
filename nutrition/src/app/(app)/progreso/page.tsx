import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentGoal, getWeightEntriesSince } from "@/lib/data/nutrition";
import { computeWeightTrend, computeWeeklyRate } from "@/lib/nutrition/trend";
import { formatKg, formatSignedKgPerWeek } from "@/lib/format";
import { WeightChart } from "@/components/progress/WeightChart";
import { WeightLogForm } from "@/components/progress/WeightLogForm";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteWeightButton } from "@/components/progress/DeleteWeightButton";

export default async function ProgresoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
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
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Progreso</h1>

      <WeightLogForm />

      {points.length === 0 ? (
        <EmptyState title="Todavía no tienes pesajes registrados" />
      ) : (
        <section className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-xs text-[var(--text-secondary)]">Hoy</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {lastObserved ? formatKg(lastObserved.weight_kg) : "—"}
              </p>
            </div>
            <div className="text-center">
              <p className="text-xs text-[var(--text-secondary)]">Tendencia</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {last ? formatKg(last.trendKg) : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-[var(--text-secondary)]">Cambio estimado</p>
              <p className="text-lg font-semibold text-[var(--text-primary)]">
                {weeklyRate.weeklyRateKg != null ? formatSignedKgPerWeek(weeklyRate.weeklyRateKg) : "—"}
              </p>
            </div>
          </div>
          <WeightChart points={points} />
        </section>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Link
          href="/progreso/medidas"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]"
        >
          Medidas corporales
        </Link>
        <Link
          href="/progreso/fotos"
          className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3 text-sm font-medium text-[var(--text-primary)]"
        >
          Fotos de progreso
        </Link>
      </div>

      {entries.length > 0 ? (
        <section className="flex flex-col gap-1.5">
          <p className="text-xs font-medium text-[var(--text-secondary)]">Pesajes recientes</p>
          <ul className="flex flex-col gap-1.5">
            {[...entries]
              .reverse()
              .slice(0, 10)
              .map((e) => (
                <li
                  key={e.id}
                  className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm"
                >
                  <span className="text-[var(--text-secondary)]">
                    {new Date(e.measured_at).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-medium text-[var(--text-primary)]">{formatKg(e.weight_kg)}</span>
                  <DeleteWeightButton id={e.id} />
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
