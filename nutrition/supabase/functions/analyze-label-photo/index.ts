// Extracts nutrition-label data from a photo (section 13). Always returns
// a review-ready draft; the original photo stays available to the client
// for side-by-side comparison — this function never decides on its own
// that the label is correct.
import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { generateStructured, GeminiUnavailableError } from "../_shared/gemini.ts";
import { labelJsonSchema, labelEstimateSchema } from "../_shared/schemas.ts";

interface RequestBody {
  image: { data: string; mimeType: string };
}

const SYSTEM_INSTRUCTION = `Eres un asistente que extrae datos de tablas nutricionales fotografiadas.

Reglas:
- Detecta si los valores están expresados por 100 g, por 100 ml o por porción/ración, y decláralo en "basis".
- Si detectas "por porción", intenta extraer también el tamaño de la porción en gramos (serving_size_g) y su descripción (serving_label).
- Usa null en cualquier campo que la etiqueta no muestre (no lo inventes).
- Si la fotografía no es legible o no es una etiqueta nutricional, pon legible=false y deja el resto de campos en 0/null.
- Responde siempre en español para brand/serving_label si aplica.`;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { supabase, user } = await requireUser(req);
    const body: RequestBody = await req.json();
    if (!body.image) return json({ error: "image_required" }, 400);

    let raw: unknown;
    try {
      raw = await generateStructured({
        systemInstruction: SYSTEM_INSTRUCTION,
        parts: [{ inlineData: { mimeType: body.image.mimeType, data: body.image.data } }],
        responseSchema: labelJsonSchema,
      });
    } catch (e) {
      if (e instanceof GeminiUnavailableError) {
        return json({ error: "ai_unavailable", message: e.message }, 503);
      }
      throw e;
    }

    const parsed = labelEstimateSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "invalid_ai_response", details: parsed.error.issues }, 502);
    }

    await supabase.from("ai_analyses").insert({
      user_id: user.id,
      analysis_type: "label",
      model: Deno.env.get("GEMINI_MODEL") ?? "gemini-3.6-flash",
      structured_result: parsed.data,
      confidence: parsed.data.legible ? "medium" : "low",
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
