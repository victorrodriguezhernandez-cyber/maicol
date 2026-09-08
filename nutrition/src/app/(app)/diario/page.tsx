import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecentDaysSummary } from "@/lib/data/diary";
import { formatKcal, formatKg, todayLocalDateString } from "@/lib/format";

const STATUS_LABEL: Record<string, string> = {
  complete: "Completo",
  partial: "Parcial",
  not_logged: "Sin registrar",
};
const STATUS_COLOR: Record<string, string> = {
  complete: "var(--success)",
  partial: "var(--warning)",
  not_logged: "var(--text-secondary)",
};

export default async function DiarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const days = await getRecentDaysSummary(supabase, user.id, 30);
  const today = todayLocalDateString();

  return (
    <div className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Diario</h1>
      <ul className="flex flex-col gap-1.5">
        {days.map((day) => (
          <li key={day.date}>
            <Link
              href={`/diario/${day.date}`}
              className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] px-4 py-2.5"
            >
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {day.date === today ? "Hoy" : day.date}
                </p>
                <p className="text-xs" style={{ color: STATUS_COLOR[day.status] }}>
                  {STATUS_LABEL[day.status]}
                </p>
              </div>
              <div className="text-right text-xs text-[var(--text-secondary)]">
                <p className="font-numeric text-sm font-semibold text-[var(--text-primary)]">
                  {formatKcal(day.totalKcal)}
                </p>
                {day.weightKg ? <p className="font-numeric">{formatKg(day.weightKg)}</p> : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
