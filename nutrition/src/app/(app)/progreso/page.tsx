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
    <div className="flex flex-col gap-7">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Progreso</h1>

      <WeightLogForm />

      {points.length === 0 ? (
        <EmptyState title="Todavía no tienes pesajes registrados" />
      ) : (
        // One continuous panel holding both the numbers and the chart — the
        // opposite composition from Hoy's open, unboxed hero, so the two
        // main screens don't read as the same template with different data.
        <section className="flex flex-col gap-1 rounded-2xl bg-[var(--surface-2)] p-4 pb-2">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-[11px] text-[var(--text-tertiary)]">Tendencia</p>
              <p className="font-numeric text-3xl font-semibold" style={{ color: "var(--metric-weight)" }}>
                {last ? formatKg(last.trendKg) : "—"}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[11px] text-[var(--text-tertiary)]">
                Hoy {lastObserved ? formatKg(lastObserved.weight_kg) : "—"} · Cambio/sem.{" "}
                {weeklyRate.weeklyRateKg != null ? formatSignedKgPerWeek(weeklyRate.weeklyRateKg) : "—"}
              </p>
            </div>
          </div>
          <WeightChart points={points} />
        </section>
      )}

      <section className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
        <Link
          href="/progreso/medidas"
          className="flex items-center justify-between py-3 text-sm font-medium text-[var(--text-primary)] active:opacity-70"
        >
          Medidas corporales
          <ChevronIcon />
        </Link>
        <Link
          href="/progreso/fotos"
          className="flex items-center justify-between py-3 text-sm font-medium text-[var(--text-primary)] active:opacity-70"
        >
          Fotos de progreso
          <ChevronIcon />
        </Link>
      </section>

      {entries.length > 0 ? (
        <section className="flex flex-col gap-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">
            Pesajes recientes
          </p>
          <ul className="flex flex-col divide-y divide-[var(--border-soft)]">
            {[...entries]
              .reverse()
              .slice(0, 10)
              .map((e) => (
                <li key={e.id} className="flex items-center justify-between py-2.5 text-sm">
                  <span className="text-[var(--text-tertiary)]">
                    {new Date(e.measured_at).toLocaleString("es-ES", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  <span className="font-numeric font-semibold text-[var(--text-primary)]">{formatKg(e.weight_kg)}</span>
                  <DeleteWeightButton id={e.id} />
                </li>
              ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)]">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
