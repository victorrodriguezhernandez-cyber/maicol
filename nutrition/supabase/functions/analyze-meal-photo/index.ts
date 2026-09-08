// Analyzes one or more photos of the same plate (section 9/10/11).
// Returns a structured, per-item estimate with a probable range and a
// confidence level — never a bare "exact" number, and never saved to the
// diary directly; the client always shows a review screen first.
import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { generateStructured, GeminiUnavailableError } from "../_shared/gemini.ts";
import { mealEstimateJsonSchema, mealEstimateResponseSchema } from "../_shared/schemas.ts";

interface RequestBody {
  images: { data: string; mimeType: string }[];
  referenceNote?: string;
}

const SYSTEM_INSTRUCTION = `Eres un asistente experto en estimación nutricional a partir de fotografías de platos de comida.

Reglas estrictas:
- Todas las fotografías que recibes pertenecen AL MISMO plato, vistas desde distintos ángulos. No las trates como alimentos independientes.
- Identifica cada componente del plato por separado (proteína, guarnición, salsa, aceite visible, etc).
- Para cada componente da una cantidad estimada, un rango razonable (mínimo-máximo) y un nivel de confianza.
- Si el usuario da una referencia de tamaño (plato, gramos conocidos de un componente), úsala para calibrar el resto.
- Si NO puedes estimar razonablemente el plato (foto ilegible, ángulo inútil, comida no identificable), pon unable_to_estimate=true, deja items vacío, y rellena clarifying_questions con 2-4 preguntas concretas (qué alimento es, cantidad aproximada, si lleva aceite, tamaño del plato). Nunca inventes una respuesta solo por completar el formulario.
- Responde siempre en español.
- Devuelve energy_kcal/protein_g/carbohydrates_g/fat_g/fiber_g como tu mejor estimación puntual para la cantidad estimada (no por 100g).`;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { supabase, user } = await requireUser(req);
    const body: RequestBody = await req.json();
    if (!body.images?.length) {
      return json({ error: "at_least_one_image_required" }, 400);
    }

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      {
        text: body.referenceNote
          ? `Referencia de tamaño proporcionada por el usuario: ${body.referenceNote}`
          : "El usuario no ha proporcionado ninguna referencia de tamaño.",
      },
      ...body.images.map((img) => ({ inlineData: { mimeType: img.mimeType, data: img.data } })),
    ];

    let raw: unknown;
    try {
      raw = await generateStructured({
        systemInstruction: SYSTEM_INSTRUCTION,
        parts,
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
      analysis_type: "photo",
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
