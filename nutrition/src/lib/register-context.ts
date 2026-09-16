import { useSearchParams } from "next/navigation";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

const MEAL_TYPES: readonly string[] = ["breakfast", "lunch", "dinner", "snack", "other"];

/**
 * A qué comida y a qué día va lo que se está registrando.
 *
 * Lo ponen en la URL el "+" de una comida del diario y la hoja de
 * registrar. Cuando no vienen, cada pantalla se comporta como siempre:
 * tipo de comida por la hora del día, fecha = hoy.
 *
 * Está centralizado porque son SIETE pantallas de captura y antes ninguna
 * leía la fecha: la foto de la merienda de ayer acababa registrada hoy.
 */
export function useRegisterContext(): { mealType?: MealType; date?: string } {
  const params = useSearchParams();
  const type = params.get("type");
  const date = params.get("date");
  return {
    mealType: type && MEAL_TYPES.includes(type) ? (type as MealType) : undefined,
    // Sólo una fecha con forma de fecha; cualquier otra cosa se ignora en
    // vez de acabar en un `new Date("...")` inválido.
    date: date && /^\d{4}-\d{2}-\d{2}$/.test(date) ? date : undefined,
  };
}
