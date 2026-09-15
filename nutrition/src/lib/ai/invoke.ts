import { FunctionsHttpError } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Llama a una Edge Function de IA y devuelve un fallo que se puede
 * explicar.
 *
 * ── El problema que resuelve ───────────────────────────────────────────
 *
 * `supabase.functions.invoke` trata CUALQUIER respuesta que no sea 2xx
 * como un error: devuelve `data: null` y un `FunctionsHttpError` cuyo
 * mensaje es siempre el mismo texto genérico ("Edge Function returned a
 * non-2xx status code"). El cuerpo que devolvió la función — que es donde
 * está el motivo real — queda dentro de `error.context`, que es la
 * `Response` sin leer.
 *
 * Por eso las pantallas comprobaban `data?.error === "ai_unavailable"`
 * DESPUÉS de mirar `error`, y esa comprobación no se cumplía nunca: para
 * cuando llegaba, ya se había salido con el mensaje genérico. La app
 * decía "inténtalo en unos segundos" tanto si faltaba la clave como si se
 * había agotado la cuota del día.
 *
 * Aquí se lee ese cuerpo y se traduce a algo que la pantalla pueda contar.
 */
export type FalloIA =
  | { tipo: "cuota"; diaria: boolean; reintentarEnSegundos: number | null }
  | { tipo: "sin_configurar" }
  | { tipo: "respuesta_invalida" }
  | { tipo: "otro" };

export interface ResultadoIA<T> {
  data: T | null;
  fallo: FalloIA | null;
}

interface CuerpoError {
  error?: string;
  daily?: boolean;
  retryAfterSeconds?: number | null;
}

function traducir(cuerpo: CuerpoError | null): FalloIA {
  switch (cuerpo?.error) {
    case "ai_quota":
      return {
        tipo: "cuota",
        diaria: cuerpo.daily !== false,
        reintentarEnSegundos: cuerpo.retryAfterSeconds ?? null,
      };
    case "ai_unavailable":
      return { tipo: "sin_configurar" };
    case "invalid_ai_response":
      return { tipo: "respuesta_invalida" };
    default:
      return { tipo: "otro" };
  }
}

export async function invokeAi<T>(
  supabase: SupabaseClient,
  fn: string,
  body: Record<string, unknown>,
): Promise<ResultadoIA<T>> {
  const { data, error } = await supabase.functions.invoke(fn, { body });

  if (error) {
    let cuerpo: CuerpoError | null = null;
    if (error instanceof FunctionsHttpError) {
      // Un cuerpo ilegible (la función se cayó antes de responder, o la
      // pasarela devolvió HTML) no debe tapar el error de verdad.
      try {
        cuerpo = (await error.context.json()) as CuerpoError;
      } catch {
        cuerpo = null;
      }
    }
    return { data: null, fallo: traducir(cuerpo) };
  }

  // Algunas funciones responden 200 con un error dentro.
  const comoError = data as CuerpoError | null;
  if (comoError?.error) return { data: null, fallo: traducir(comoError) };

  return { data: data as T, fallo: null };
}

/** El texto que se le enseña al usuario. Uno por causa, no uno para todo. */
export function mensajeDeFallo(fallo: FalloIA, que = "analizar"): string {
  switch (fallo.tipo) {
    case "cuota":
      return fallo.diaria
        ? "Se han agotado las peticiones de IA de hoy (el plan gratuito de Google da 20 al día para toda la app). Vuelve mañana, o activa la facturación en Google AI Studio para quitar el tope."
        : `Demasiadas peticiones seguidas. Espera ${fallo.reintentarEnSegundos ?? 60} segundos y vuelve a intentarlo.`;
    case "sin_configurar":
      return "La IA no está configurada (falta la clave GEMINI_API_KEY en Supabase).";
    case "respuesta_invalida":
      return "La IA respondió algo que no se ha podido leer. Vuelve a intentarlo.";
    default:
      return `No se ha podido ${que}. Inténtalo de nuevo en unos segundos.`;
  }
}
