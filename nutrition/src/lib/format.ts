import { roundForDisplay } from "@/lib/nutrition/units";

export function formatKcal(value: number): string {
  return `${roundForDisplay(value).toLocaleString("es-ES")} kcal`;
}

export function formatGrams(value: number, decimals = 0): string {
  return `${roundForDisplay(value, decimals).toLocaleString("es-ES")} g`;
}

export function formatKg(value: number, decimals = 1): string {
  return `${roundForDisplay(value, decimals).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kg`;
}

/**
 * Un pesaje tal y como lo escribiste.
 *
 * `formatKg` redondea a un decimal, que está bien para una TENDENCIA —un
 * valor calculado, donde el segundo decimal es precisión falsa— y está
 * mal para la lectura de la báscula: si te pesas 64,35 y la app te
 * enseña "64,4", te está corrigiendo un dato que tú mediste. La columna
 * guarda dos decimales (`numeric(5,2)`), así que el dato está entero y
 * lo único que fallaba era enseñarlo.
 *
 * Hasta dos decimales, y sin ceros de relleno al final: 64,35 · 64,1 ·
 * 64,0. El primer decimal se mantiene siempre porque en un peso corporal
 * "64" a secas se lee como una cifra redondeada, que es justo lo
 * contrario de lo que se quiere decir.
 */
export function formatPesaje(value: number): string {
  const dosDecimales = roundForDisplay(value, 2);
  const decimales = Number.isInteger(dosDecimales * 10) ? 1 : 2;
  return `${dosDecimales.toLocaleString("es-ES", {
    minimumFractionDigits: decimales,
    maximumFractionDigits: decimales,
  })} kg`;
}

export function formatSignedKgPerWeek(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${roundForDisplay(value, decimals).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kg/semana`;
}

// The app has one user and no timezone preference in the UI, so this is a
// deliberate hardcoded default rather than a per-user setting — but it's
// still load-bearing: every "what time is it" / "what day is today"
// question below is meaningless without it. Vercel's server runtime (and
// most serverless hosts) defaults to UTC, so without an explicit
// timeZone, Server Components format times in UTC — a meal logged at
// 21:00 in Madrid would render as "19:00" (CEST, UTC+2) or "20:00" (CET,
// UTC+1), and anything logged between local midnight and ~2am would get
// grouped under the wrong calendar day entirely. Every date/time
// formatter and boundary in this file goes through this constant so the
// fix can't silently regress in one call site while another gets it.
export const APP_TIMEZONE = "Europe/Madrid";

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
  timeZone: APP_TIMEZONE,
});

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

const dateHeaderFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: APP_TIMEZONE,
});

export function formatDateHeader(date: Date): string {
  const s = dateHeaderFormatter.format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

const dateTimeShortFormatter = new Intl.DateTimeFormat("es-ES", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: APP_TIMEZONE,
});

/** "08/09 21:34" — weigh-in lists, Coach IA conversation history. */
export function formatDateTimeShort(iso: string): string {
  return dateTimeShortFormatter.format(new Date(iso));
}

const dateShortFormatter = new Intl.DateTimeFormat("es-ES", { timeZone: APP_TIMEZONE });

/** "8/9/2026" — progress photos, body measurements. */
export function formatDateShort(iso: string): string {
  return dateShortFormatter.format(new Date(iso));
}

const localDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date (YYYY-MM-DD) an instant falls on in APP_TIMEZONE —
 * never slice a raw ISO string for this. Slicing gives the UTC calendar
 * date, which for a meal logged at 00:30 in Madrid (still "today" to the
 * user) is still "yesterday" in UTC. */
export function toLocalDateKey(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return localDateKeyFormatter.format(date);
}

export function todayLocalDateString(): string {
  return toLocalDateKey(new Date());
}

const hourFormatter = new Intl.DateTimeFormat("en-US", {
  hour: "numeric",
  hour12: false,
  timeZone: APP_TIMEZONE,
});

/** The hour-of-day (0-23) in APP_TIMEZONE — never `date.getHours()` for
 * anything a Server Component computes; that reads the server's own
 * clock (UTC on Vercel), not the user's. Used for "Buenos días/tardes/
 * noches" — the one greeting that was still silently wrong in the same
 * way formatTime used to be. */
export function localHour(date: Date = new Date()): number {
  const part = hourFormatter.formatToParts(date).find((p) => p.type === "hour");
  return part ? Number(part.value) % 24 : date.getHours();
}

/** Minutes APP_TIMEZONE is ahead of UTC for the instant `date` represents
 * — varies with DST (+60 in winter/CET, +120 in summer/CEST), so this is
 * computed per-date rather than hardcoded. Both sides of the subtraction
 * go through the same Date-string round trip in this same runtime, so
 * the runtime's own default timezone cancels out of the result. */
function tzOffsetMinutes(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return (tzDate.getTime() - utcDate.getTime()) / 60_000;
}

/** UTC instant bounds — as ISO strings — spanning one APP_TIMEZONE
 * calendar date. The correct way to ask "everything that happened on
 * this date", regardless of what timezone the code executes in. */
export function localDayBoundsUtc(date: string): { start: string; end: string } {
  const naiveStart = new Date(`${date}T00:00:00Z`);
  const offsetMinutes = tzOffsetMinutes(naiveStart, APP_TIMEZONE);
  const start = new Date(naiveStart.getTime() - offsetMinutes * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

/**
 * El instante que se guarda al registrar una comida en una fecha concreta.
 *
 * Para HOY es "ahora", que es lo que quieres: la comida queda en su hora
 * real. Para un día pasado no hay hora que valga — nadie se acuerda de si
 * merendó a las 17:40 — así que se ancla a mediodía de esa fecha en la
 * zona de la app. Mediodía y no medianoche porque medianoche está a un
 * cambio de hora de caerse al día anterior, y entonces la comida
 * aparecería en el día equivocado.
 */
export function mealInstantForDate(date: string | null | undefined): string {
  if (!date || date === todayLocalDateString()) return new Date().toISOString();
  const { start } = localDayBoundsUtc(date);
  return new Date(new Date(start).getTime() + 12 * 60 * 60 * 1000).toISOString();
}

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Merienda",
  other: "Otro",
};
