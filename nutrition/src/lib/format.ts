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

export function formatSignedKgPerWeek(value: number, decimals = 2): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${roundForDisplay(value, decimals).toLocaleString("es-ES", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })} kg/semana`;
}

const timeFormatter = new Intl.DateTimeFormat("es-ES", {
  hour: "2-digit",
  minute: "2-digit",
  hour12: false,
});

export function formatTime(iso: string): string {
  return timeFormatter.format(new Date(iso));
}

const dateHeaderFormatter = new Intl.DateTimeFormat("es-ES", {
  weekday: "long",
  day: "numeric",
  month: "long",
});

export function formatDateHeader(date: Date): string {
  const s = dateHeaderFormatter.format(date);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function todayLocalDateString(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset();
  const local = new Date(now.getTime() - offset * 60_000);
  return local.toISOString().slice(0, 10);
}

export const MEAL_TYPE_LABELS: Record<string, string> = {
  breakfast: "Desayuno",
  lunch: "Comida",
  dinner: "Cena",
  snack: "Merienda",
  other: "Otro",
};
