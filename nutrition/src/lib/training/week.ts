/**
 * Semanas de entrenamiento.
 *
 * La semana empieza el LUNES, no el domingo. No es una preferencia
 * estética: todo el volumen semanal (`volume.ts`) se compara contra
 * rangos "por semana", y una rutina de gimnasio se organiza de lunes a
 * domingo. Con la semana arrancando en domingo, el entreno del domingo
 * caería en la semana siguiente y el recuento saldría partido.
 */

export function weekBounds(reference: Date): { start: Date; end: Date } {
  const start = new Date(reference);
  // getDay(): 0 = domingo. Queremos que el lunes sea el día 0 de la
  // semana, así que el domingo retrocede 6 días y no 0.
  const offset = (start.getDay() + 6) % 7;
  start.setDate(start.getDate() - offset);
  start.setHours(0, 0, 0, 0);

  const end = new Date(start);
  end.setDate(end.getDate() + 7);
  end.setMilliseconds(-1);

  return { start, end };
}

/** La semana de hace `weeksAgo` semanas (0 = ésta). */
export function weekBoundsAgo(weeksAgo: number, reference = new Date()) {
  const d = new Date(reference);
  d.setDate(d.getDate() - weeksAgo * 7);
  return weekBounds(d);
}

const WEEKDAYS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
const MONTHS = [
  "ene", "feb", "mar", "abr", "may", "jun",
  "jul", "ago", "sep", "oct", "nov", "dic",
];

/**
 * "Hoy", "Ayer" o "martes, 9 sep". Lo cercano se nombra en relativo
 * porque es como lo piensas; lo lejano lleva fecha porque "hace 23 días"
 * no ubica a nadie.
 *
 * Acepta un `YYYY-MM-DD` y lo interpreta como día local. `new Date("2026-09-13")`
 * lo leería como medianoche UTC, que en España es el día anterior a las
 * 22:00 — y el historial enseñaría el día equivocado media jornada.
 */
export function formatWeekday(dateString: string): string {
  const d = parseLocalDate(dateString);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const diffDays = Math.round((today.getTime() - d.getTime()) / 86_400_000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  if (diffDays > 1 && diffDays < 7) return capitalize(WEEKDAYS[d.getDay()]);
  return `${capitalize(WEEKDAYS[d.getDay()])}, ${d.getDate()} ${MONTHS[d.getMonth()]}`;
}

export function parseLocalDate(dateString: string): Date {
  const [y, m, day] = dateString.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, day ?? 1);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** "Esta semana", "La semana pasada", "Hace 3 semanas". */
export function weekLabel(weeksAgo: number): string {
  if (weeksAgo === 0) return "Esta semana";
  if (weeksAgo === 1) return "La semana pasada";
  return `Hace ${weeksAgo} semanas`;
}
