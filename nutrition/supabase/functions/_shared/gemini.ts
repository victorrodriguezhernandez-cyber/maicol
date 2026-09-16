// Envoltorio de Gemini para los Edge Functions.
import { GoogleGenAI } from "npm:@google/genai@^1.0.0";

/**
 * El modelo que se usa, y el de antes por si el nuevo falla.
 *
 * ── Por qué está aquí y ya no en el secreto GEMINI_MODEL ───────────────
 *
 * El plan gratuito de `gemini-3.6-flash` da 20 peticiones AL DÍA para
 * TODA la app (chat, fotos, etiquetas, voz, texto y rutinas salen del
 * mismo bote), y se agotaban a media tarde. Los Flash-Lite tienen un tope
 * mucho más alto.
 *
 * El secreto `GEMINI_MODEL` YA NO SE LEE, a propósito: sigue guardando
 * `gemini-3.6-flash`, así que leerlo devolvería el modelo de 20/día y
 * este cambio no serviría de nada. Para cambiar el modelo sin desplegar
 * está `GEMINI_MODEL_OVERRIDE`, que hoy no existe; en cuanto se cree como
 * secreto en Supabase, manda.
 *
 * ── La red de seguridad ────────────────────────────────────────────────
 *
 * Un nombre de modelo equivocado, o un modelo que no acepte audio, dejaría
 * la app SIN IA, que es peor que tener 20 peticiones. Por eso
 * `conModeloDeReserva` reintenta una vez con el modelo de antes cuando el
 * error es del modelo (no existe, o no acepta ese tipo de entrada), y se
 * queda en él para el resto de la vida de este isolate.
 */
const MODELO_PREFERIDO = Deno.env.get("GEMINI_MODEL_OVERRIDE") ?? "gemini-3.5-flash-lite";
const MODELO_RESERVA = "gemini-3.6-flash";

let modeloActual = MODELO_PREFERIDO;

/** El modelo que se está usando DE VERDAD — lo que se guarda en
 *  `ai_analyses.model` tiene que ser el que produjo el resultado. */
export function getGeminiModel(): string {
  return modeloActual;
}

/**
 * ¿El error es "ese modelo no me vale" y no otra cosa? Sólo entonces
 * merece la pena reintentar con otro: una cuota agotada o un fallo de red
 * no se arreglan cambiando de modelo.
 */
export function esErrorDeModelo(e: unknown): boolean {
  const t = e instanceof Error ? e.message : String(e);
  if (/RESOURCE_EXHAUSTED|exceeded your current quota/i.test(t)) return false;
  return (
    /NOT_FOUND|is not found|not supported|unsupported|INVALID_ARGUMENT/i.test(t) &&
    /model|modality|mime|inline_?data|audio/i.test(t)
  );
}

export async function conModeloDeReserva<T>(fn: (modelo: string) => Promise<T>): Promise<T> {
  try {
    return await fn(modeloActual);
  } catch (e) {
    if (modeloActual === MODELO_RESERVA || !esErrorDeModelo(e)) throw e;
    const motivo = (e instanceof Error ? e.message : String(e)).slice(0, 300);
    console.error(`Modelo ${modeloActual} descartado (${motivo}); se pasa a ${MODELO_RESERVA}`);
    modeloActual = MODELO_RESERVA;
    return await fn(MODELO_RESERVA);
  }
}

function getClient(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new GeminiUnavailableError("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

export class GeminiUnavailableError extends Error {}

/**
 * La cuota del plan se ha agotado. NO es lo mismo que un error pasajero,
 * aunque Google devuelva 429 para las dos cosas.
 *
 * El plan gratuito tiene un tope POR DÍA (20 peticiones por modelo y
 * proyecto). Cuando se agota, reintentar no arregla nada: sólo gasta más
 * cuota y hace esperar al usuario para acabar fallando igual. Y decirle
 * "inténtalo en unos segundos" es mentira — no vuelve hasta que Google
 * reinicia el contador.
 */
export class GeminiQuotaError extends Error {
  /** Segundos que Google pide esperar, si los dice. */
  readonly retryAfterSeconds: number | null;
  /** true = tope diario; false = tope por minuto, que sí pasa solo. */
  readonly daily: boolean;

  constructor(message: string, daily: boolean, retryAfterSeconds: number | null) {
    super(message);
    this.name = "GeminiQuotaError";
    this.daily = daily;
    this.retryAfterSeconds = retryAfterSeconds;
  }
}

function errorText(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/**
 * Distingue las dos caras del 429. Google mete el detalle en el cuerpo del
 * error: `quotaId` acaba en `PerDay...` cuando es el tope diario y en
 * `PerMinute...` cuando es el de ráfaga.
 */
export function asQuotaError(e: unknown): GeminiQuotaError | null {
  const text = errorText(e);
  if (!/RESOURCE_EXHAUSTED|exceeded your current quota/i.test(text)) return null;
  const retry = text.match(/"retryDelay"\s*:\s*"(\d+(?:\.\d+)?)s"/);
  return new GeminiQuotaError(
    text,
    /PerDay/i.test(text),
    retry ? Math.ceil(Number(retry[1])) : null,
  );
}

// Gemini occasionally returns a transient error — a per-minute rate limit
// (429) or "model currently experiencing high demand" (503 UNAVAILABLE) —
// that has nothing to do with the key being misconfigured (that's
// GeminiUnavailableError, thrown before any request is even made). Retry a
// couple of times with backoff before giving up, since these are commonly
// resolved within a second or two.
export function isTransientGeminiError(e: unknown): boolean {
  // El tope diario NO es pasajero: reintentarlo gasta tres veces la cuota
  // que queda para conseguir el mismo fallo.
  if (asQuotaError(e)?.daily) return false;
  return /429|503|rate.?limit|overloaded|unavailable|high demand/i.test(errorText(e));
}

export async function withGeminiRetry<T>(fn: () => Promise<T>): Promise<T> {
  const backoffMs = [500, 1500];
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      const quota = asQuotaError(e);
      if (quota?.daily) throw quota;
      if (attempt >= backoffMs.length || !isTransientGeminiError(e)) {
        throw quota ?? e;
      }
      await new Promise((resolve) => setTimeout(resolve, backoffMs[attempt]));
    }
  }
}

export interface StructuredGenerationInput {
  systemInstruction: string;
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  >;
  // OpenAPI-subset JSON Schema, per Gemini's responseSchema contract.
  responseSchema: Record<string, unknown>;
}

/**
 * Requests JSON structured output (never free-form text we'd have to
 * parse ourselves — section 5: "nunca depender de parsing improvisado").
 * The caller is still expected to validate the parsed JSON against a Zod
 * schema before trusting it; this only constrains what the model *tries*
 * to produce.
 */
export async function generateStructured({
  systemInstruction,
  parts,
  responseSchema,
}: StructuredGenerationInput): Promise<unknown> {
  const ai = getClient();
  const response = await conModeloDeReserva((modelo) =>
    withGeminiRetry(() =>
      ai.models.generateContent({
        model: modelo,
        contents: [{ role: "user", parts }],
        config: {
          systemInstruction,
          responseMimeType: "application/json",
          responseSchema,
        },
      }),
    ),
  );

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return JSON.parse(text);
}
