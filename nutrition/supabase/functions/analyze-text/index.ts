// Free-text meal description -> structured items (section 14).
import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { generateStructured, GeminiUnavailableError } from "../_shared/gemini.ts";
import { mealEstimateJsonSchema, mealEstimateResponseSchema } from "../_shared/schemas.ts";

interface RequestBody {
  text: string;
}

const SYSTEM_INSTRUCTION = `Eres un asistente que convierte descripciones en lenguaje natural (español, informal, con cantidades aproximadas como "un poco", "medio", "unas lonchas") en una lista estructurada de alimentos con cantidades y macros estimados.

Reglas:
- Divide la descripción en un elemento por cada alimento distinto mencionado.
- Convierte cantidades imprecisas ("un puñado", "medio aguacate") en una estimación en gramos/ml razonable, y refleja la incertidumbre en range_min/range_max y confidence.
- Cuando el usuario da una cantidad exacta (p.ej. "180 gramos de pollo"), usa exactamente esa cantidad y confidence="high", con un rango estrecho.
- Si el texto es demasiado vago para estimar nada útil, pon unable_to_estimate=true y clarifying_questions con lo que necesitarías saber.
- Responde siempre en español.`;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { supabase, user } = await requireUser(req);
    const body: RequestBody = await req.json();
    if (!body.text?.trim()) return json({ error: "text_required" }, 400);

    let raw: unknown;
    try {
      raw = await generateStructured({
        systemInstruction: SYSTEM_INSTRUCTION,
        parts: [{ text: body.text }],
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
      analysis_type: "text",
      model: Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash",
      input_ref: body.text.slice(0, 500),
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
