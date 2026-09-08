// Mirrors the timezone handling in src/lib/format.ts — duplicated here for
// the same reason trend.ts is duplicated: this Edge Function runs on Deno
// and can't import from src/. Supabase Edge Functions run in UTC, and this
// app has one user, based in Madrid — every "what day is today" / "what
// happened on this date" question here needs to go through this, or it
// silently answers in the server's timezone instead of the user's.
const APP_TIMEZONE = "Europe/Madrid";

const localDateKeyFormatter = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

/** The calendar date (YYYY-MM-DD) an instant falls on in APP_TIMEZONE —
 * never slice a raw ISO string for this (see format.ts for why). */
export function toLocalDateKey(iso: string | Date): string {
  const date = typeof iso === "string" ? new Date(iso) : iso;
  return localDateKeyFormatter.format(date);
}

export function todayIso(): string {
  return toLocalDateKey(new Date());
}

function tzOffsetMinutes(date: Date, timeZone: string): number {
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  const tzDate = new Date(date.toLocaleString("en-US", { timeZone }));
  return (tzDate.getTime() - utcDate.getTime()) / 60_000;
}

/** UTC instant bounds — as ISO strings — spanning one APP_TIMEZONE
 * calendar date. */
export function localDayBoundsUtc(date: string): { start: string; end: string } {
  const naiveStart = new Date(`${date}T00:00:00Z`);
  const offsetMinutes = tzOffsetMinutes(naiveStart, APP_TIMEZONE);
  const start = new Date(naiveStart.getTime() - offsetMinutes * 60_000);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1);
  return { start: start.toISOString(), end: end.toISOString() };
}
