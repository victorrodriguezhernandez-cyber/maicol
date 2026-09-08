// Voice meal description -> structured items (section 15). The audio is
// forwarded to Gemini in-memory and never written to storage or logged —
// it is discarded the moment this function returns, unless a future
// "keep recording" opt-in explicitly changes that (not implemented).
import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { generateStructured, GeminiUnavailableError } from "../_shared/gemini.ts";
import { mealEstimateJsonSchema, mealEstimateResponseSchema } from "../_shared/schemas.ts";

interface RequestBody {
  audio: { data: string; mimeType: string };
}

const SYSTEM_INSTRUCTION = `Eres un asistente que escucha una descripción hablada en español (informal, puede tener muletillas o cantidades aproximadas) de lo que alguien ha comido, y la convierte en una lista estructurada de alimentos con cantidades y macros estimados.

Reglas:
- Transcribe mentalmente el audio y extrae un elemento por cada alimento distinto mencionado, igual que harías con una descripción de texto.
- No hace falta que el usuario pronuncie bien los nombres de los alimentos: interpreta la intención más probable.
- Refleja la incertidumbre de cantidades aproximadas en range_min/range_max y confidence.
- Si el audio es ilegible/inentendible o no describe comida, pon unable_to_estimate=true y clarifying_questions con lo que necesitarías saber.
- Responde siempre en español.`;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { supabase, user } = await requireUser(req);
    const body: RequestBody = await req.json();
    if (!body.audio) return json({ error: "audio_required" }, 400);

    let raw: unknown;
    try {
      raw = await generateStructured({
        systemInstruction: SYSTEM_INSTRUCTION,
        parts: [{ inlineData: { mimeType: body.audio.mimeType, data: body.audio.data } }],
        responseSchema: mealEstimateJsonSchema,
      });
    } catch (e) {
      if (e instanceof GeminiUnavailableError) {
        return json({ error: "ai_unavailable", message: e.message }, 503);
      }
      throw e;
    }

    const parsed = mealEstimateResponseSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "invalid_ai_response", details: parsed.error.issues }, 502);
    }

    await supabase.from("ai_analyses").insert({
      user_id: user.id,
      analysis_type: "voice",
      model: Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash",
      structured_result: parsed.data,
      confidence: parsed.data.overall_confidence,
      accepted: false,
    });

    return json(parsed.data, 200);
  } catch (e) {
    if (e instanceof Response) return withCors(e);
    console.error(e);
    return json({ error: "internal_error" }, 500);
  }
});

function json(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "content-type": "application/json" },
  });
}

function withCors(res: Response): Response {
  const headers = new Headers(res.headers);
  for (const [k, v] of Object.entries(corsHeaders)) headers.set(k, v);
  return new Response(res.body, { status: res.status, headers });
}
