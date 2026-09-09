import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getRecentDaysSummary, type DaySummary } from "@/lib/data/diary";
import { getCurrentGoal } from "@/lib/data/nutrition";
import { formatKcal, formatKg, formatGrams, todayLocalDateString } from "@/lib/format";
import { PageShell } from "@/components/ui/PageShell";

const STATUS_LABEL: Record<string, string> = {
  complete: "Día completo",
  partial: "Parcial",
  not_logged: "Sin registrar",
};

type Tier = "on_target" | "under" | "over" | "none";
const TIER_COLOR: Record<Tier, string> = {
  on_target: "var(--success)",
  under: "var(--metric-weight)",
  over: "var(--warning)",
  none: "var(--text-tertiary)",
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
    <PageShell eyebrow="Últimos 30 días" title="Diario">
      <ul className="flex flex-col gap-2">
        {days.map((day) => {
          const tier = tierFor(day, goal?.kcal);
          const isToday = day.date === today;
          const dateObj = new Date(`${day.date}T12:00:00`);
          return (
            <li key={day.date}>
              <Link
                href={`/diario/${day.date}`}
                className="tap-row surface-soft flex items-center gap-3 px-4 py-3"
              >
                <span
                  aria-hidden="true"
                  className="h-9 w-1 shrink-0 rounded-full"
                  style={{ backgroundColor: TIER_COLOR[tier] }}
                />
                <div className="flex w-14 shrink-0 flex-col leading-tight">
                  <span className="text-[13px] font-semibold text-[var(--text-primary)]">
                    {isToday ? "Hoy" : WEEKDAY.format(dateObj)}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">{DAY_MONTH.format(dateObj)}</span>
                </div>

                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs text-[var(--text-tertiary)]">{STATUS_LABEL[day.status]}</p>
                  {day.totalKcal > 0 ? (
                    <p className="text-metric text-[11px] text-[var(--text-secondary)]">
                      {formatGrams(day.proteinG)} prot.
                    </p>
                  ) : null}
                </div>

                <div className="shrink-0 text-right">
                  <p className="text-metric text-sm text-[var(--text-primary)]">
                    {day.totalKcal > 0 ? formatKcal(day.totalKcal) : "—"}
                  </p>
                  {day.weightKg ? (
                    <p className="text-metric text-[11px] text-[var(--text-tertiary)]">{formatKg(day.weightKg)}</p>
                  ) : null}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>
    </PageShell>
  );
}
