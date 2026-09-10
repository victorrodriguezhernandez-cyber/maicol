import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getRecentDaysSummary, type DaySummary } from "@/lib/data/diary";
import { getCurrentGoal } from "@/lib/data/nutrition";
import { formatKcal, formatKg, formatGrams, todayLocalDateString } from "@/lib/format";

type Tier = "on_target" | "under" | "over" | "none";
const TIER_COLOR: Record<Tier, string> = {
  on_target: "var(--success)",
  under: "var(--metric-weight)",
  over: "var(--warning)",
  none: "var(--border-strong)",
};

function tierFor(day: DaySummary, goalKcal: number | undefined): Tier {
  if (day.totalKcal <= 0) return "none";
  if (!goalKcal) return "none";
  const ratio = day.totalKcal / goalKcal;
  if (ratio > 1.1) return "over";
  if (ratio < 0.9) return "under";
  return "on_target";
}

const WEEKDAY = new Intl.DateTimeFormat("es-ES", { weekday: "short" });
const DAY_MONTH = new Intl.DateTimeFormat("es-ES", { day: "numeric", month: "short" });

export default async function DiarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const [days, goal] = await Promise.all([
    getRecentDaysSummary(supabase, user.id, 30),
    getCurrentGoal(supabase, user.id),
  ]);
  const today = todayLocalDateString();

  return (
    <div className="flex flex-col gap-1 pb-6">
      <div className="flex items-baseline justify-between pb-3">
        <h1 className="text-hero-title text-[1.6rem] text-[var(--text-primary)]">Diario</h1>
        <p className="text-meta">Últimos 30 días</p>
      </div>

      {/* Timeline: dividers and a color bar carry the structure — no
          repeated card chrome per day, and a day with nothing logged is
          a thin, quiet line rather than an empty card the same size as
          a populated one. */}
      <div className="flex flex-col">
        {days.map((day) => {
          const tier = tierFor(day, goal?.kcal);
          const isToday = day.date === today;
          const dateObj = new Date(`${day.date}T12:00:00`);
          const hasData = day.totalKcal > 0;
          const pct = goal?.kcal ? Math.min(100, (day.totalKcal / goal.kcal) * 100) : 0;

          return (
            <Link
              key={day.date}
              href={`/diario/${day.date}`}
              className={`tap-row flex items-center gap-3 border-b border-[var(--border-soft)] ${
                hasData ? "py-3" : "py-2"
              }`}
            >
              <span
                aria-hidden="true"
                className={`shrink-0 rounded-full ${hasData ? "h-9 w-[3px]" : "h-4 w-[3px]"}`}
                style={{ backgroundColor: TIER_COLOR[tier] }}
              />
              <div className="flex w-14 shrink-0 flex-col leading-tight">
                <span
                  className={`text-[13px] font-semibold ${hasData ? "text-[var(--text-primary)]" : "text-[var(--text-tertiary)]"}`}
                >
                  {isToday ? "Hoy" : WEEKDAY.format(dateObj)}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">{DAY_MONTH.format(dateObj)}</span>
              </div>

              {hasData ? (
                <div className="min-w-0 flex-1">
                  <span className="text-metric block text-sm text-[var(--text-primary)]">
                    {formatKcal(day.totalKcal)}
                  </span>
                  <div className="mt-0.5 flex items-center justify-between gap-2">
                    <span className="text-metric truncate text-[11px] text-[var(--text-tertiary)]">
                      {formatGrams(day.proteinG)} prot.
                    </span>
                    {day.weightKg ? (
                      <span className="text-metric shrink-0 text-[11px] text-[var(--text-tertiary)]">
                        {formatKg(day.weightKg)}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${pct}%`, backgroundColor: TIER_COLOR[tier] }}
                    />
                  </div>
                </div>
              ) : (
                <span className="min-w-0 flex-1 truncate text-xs text-[var(--text-tertiary)]">Sin registrar</span>
              )}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
