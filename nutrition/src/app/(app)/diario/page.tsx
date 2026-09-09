import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
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
  not_logged: "var(--text-tertiary)",
};

export default async function DiarioPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const days = await getRecentDaysSummary(supabase, user.id, 30);
  const today = todayLocalDateString();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold tracking-tight text-[var(--text-primary)]">Diario</h1>
      <ul className="flex flex-col divide-y divide-[var(--border-soft)]">
        {days.map((day) => (
          <li key={day.date}>
            <Link href={`/diario/${day.date}`} className="flex items-center gap-3 py-2.5 active:opacity-70">
              <span
                className="h-2 w-2 shrink-0 rounded-full"
                style={{ backgroundColor: STATUS_COLOR[day.status] }}
                aria-hidden="true"
              />
              <div className="flex-1">
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {day.date === today ? "Hoy" : day.date}
                </p>
                <p className="text-xs text-[var(--text-tertiary)]">{STATUS_LABEL[day.status]}</p>
              </div>
              <div className="text-right">
                <p className="font-numeric text-sm font-semibold text-[var(--text-primary)]">
                  {formatKcal(day.totalKcal)}
                </p>
                {day.weightKg ? (
                  <p className="font-numeric text-xs text-[var(--text-tertiary)]">{formatKg(day.weightKg)}</p>
                ) : null}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
