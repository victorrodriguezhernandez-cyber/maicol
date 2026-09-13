// Monta una rutina de entreno a partir de lo que el usuario cuenta, o de
// una foto de la rutina que ya sigue.
//
// ── La regla que gobierna esta función ──────────────────────────────────
//
// El modelo NO inventa ejercicios. Se le manda el catálogo real (el
// compartido más los propios del usuario) y sólo puede devolver nombres
// que estén en esa lista. Al volver, cada nombre se busca en el catálogo
// que se le mandó:
//
//   * si coincide, se resuelve a su id real;
//   * si no coincide, NO se cuela ni se sustituye por algo parecido: se
//     devuelve en `unmatched` y la app se lo enseña al usuario.
//
// Es la regla 1 del proyecto ("la IA nunca inventa un dato cuando existe
// una fuente mejor") aplicada a los ejercicios, y la razón por la que
// esta función lleva la resolución de nombres en vez de dejársela al
// cliente.
//
// ── Y no escribe nada ──────────────────────────────────────────────────
//
// Devuelve una PROPUESTA. La app se la enseña al usuario, y si la acepta
// llama a `createRoutine`, la misma Server Action validada que usa el
// editor manual — que vuelve a comprobar que cada id existe. Dos
// comprobaciones independientes, ninguna confía en la otra (regla 4).

import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import {
  generateStructured,
  getGeminiModel,
  GeminiUnavailableError,
} from "../_shared/gemini.ts";
import {
  routineProposalJsonSchema,
  routineProposalSchema,
} from "../_shared/schemas.ts";

interface RequestBody {
  /** Lo que el usuario cuenta: días, material, objetivos, lesiones… */
  text?: string;
  /** Foto de una rutina escrita, o captura de otra app. */
  imageBase64?: string;
  imageMimeType?: string;
  /** Filtra el catálogo a lo que el usuario tiene a mano. */
  equipment?: string[];
}

interface CatalogEntry {
  id: string;
  name: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment: string;
  mechanic: string;
  pattern: string;
  default_reps_min: number;
  default_reps_max: number;
  default_rest_seconds: number;
}

const SYSTEM_INSTRUCTION = `Eres un entrenador de fuerza que monta rutinas de gimnasio. Respondes SIEMPRE en español de España.

REGLA MÁS IMPORTANTE: sólo puedes usar ejercicios del CATÁLOGO que se te da. El campo "exercise_name" debe copiar EXACTAMENTE, carácter a carácter, un nombre del catálogo. Si necesitas un ejercicio que no está, NO lo inventes ni lo aproximes: mete su nombre en "unmatched" y usa del catálogo el más parecido que sí exista.

Cómo montar la rutina:
- Ajusta el número de días a los que el usuario dice que puede entrenar. Si no lo dice, 3 o 4.
- Equilibra empujes y tirones mirando el campo "patrón" de cada ejercicio. Una rutina con tres empujes horizontales y ningún tirón está mal montada aunque suene bien.
- Empieza cada día por los compuestos y deja los aislamientos para el final: los compuestos exigen más técnica y más fuerza, y cansados se hacen peor.
- Rangos de repeticiones según el objetivo: fuerza 3-6, hipertrofia 6-15, resistencia 12-20. Descansos: 2-4 min en compuestos pesados, 60-90 s en aislamientos.
- RIR: 1-3 en la mayoría de series. 0 sólo en aislamientos y como mucho en la última serie.
- Volumen semanal por músculo: apunta a entre 10 y 20 series efectivas de los grupos grandes. Pasarse de ahí genera más fatiga de la que se recupera.

Sé honesto en "warnings":
- Si el usuario menciona una lesión o un dolor, dilo: recomiéndale que lo vea un profesional y evita los ejercicios que lo carguen.
- Si no te ha dado información suficiente (días, material, nivel), di qué has supuesto.
- Si el material disponible limita mucho la rutina, dilo.

En "rationale" explica en dos o tres frases por qué has elegido ESTA estructura, en lenguaje llano. El usuario lo va a leer antes de aceptar.`;

const PHOTO_INSTRUCTION = `${SYSTEM_INSTRUCTION}

La entrada es una imagen: una rutina escrita a mano, impresa, o una captura de pantalla de otra aplicación. Tu trabajo es LEERLA y convertirla al catálogo, no diseñar una nueva.

- Respeta los días, ejercicios, series y repeticiones que veas escritos. No los "mejores".
- Cada ejercicio de la imagen tradúcelo al nombre del catálogo que signifique lo mismo. "Press banca" es "Press de banca con barra". "Jalón" es "Jalón al pecho en polea".
- Lo que no puedas leer con seguridad, o no exista en el catálogo, va a "unmatched". No adivines.
- Si la imagen no contiene una rutina de entreno, deja "days" vacío y dilo en "warnings".`;

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { supabase, user } = await requireUser(req);
    const body: RequestBody = await req.json();

    const hasText = Boolean(body.text?.trim());
    const hasImage = Boolean(body.imageBase64);
    if (!hasText && !hasImage) return json({ error: "input_required" }, 400);

    // El catálogo que el usuario puede ver: el compartido más los suyos.
    // Va por RLS, así que nunca puede llegar aquí el ejercicio de otro.
    let query = supabase
      .from("exercises")
      .select(
        "id, name, primary_muscle, secondary_muscles, equipment, mechanic, pattern, default_reps_min, default_reps_max, default_rest_seconds",
      )
      .eq("is_active", true)
      .order("name");

    if (body.equipment?.length) {
      // El peso corporal siempre entra: aunque el usuario diga que sólo
      // tiene mancuernas, las flexiones y las dominadas siguen estando.
      query = query.in("equipment", [...new Set([...body.equipment, "peso_corporal"])]);
    }

    const { data: catalog, error: catalogError } = await query;
    if (catalogError) throw catalogError;

    const entries = (catalog ?? []) as CatalogEntry[];
    if (entries.length === 0) {
      return json(
        {
          error: "empty_catalog",
          message: "No hay ejercicios disponibles con ese material.",
        },
        400,
      );
    }

    const catalogText = entries
      .map(
        (e) =>
          `- ${e.name} | músculo: ${e.primary_muscle}${
            e.secondary_muscles.length ? ` (+${e.secondary_muscles.join(", ")})` : ""
          } | material: ${e.equipment} | ${e.mechanic} | patrón: ${e.pattern} | reps habituales: ${e.default_reps_min}-${e.default_reps_max} | descanso: ${e.default_rest_seconds}s`,
      )
      .join("\n");

    const parts: Array<{ text: string } | { inlineData: { mimeType: string; data: string } }> = [
      { text: `CATÁLOGO DE EJERCICIOS DISPONIBLES:\n${catalogText}` },
    ];
    if (hasImage) {
      parts.push({
        inlineData: {
          mimeType: body.imageMimeType ?? "image/jpeg",
          data: body.imageBase64!,
        },
      });
    }
    if (hasText) {
      parts.push({ text: `LO QUE CUENTA EL USUARIO:\n${body.text!.slice(0, 4000)}` });
    }

    let raw: unknown;
    try {
      raw = await generateStructured({
        systemInstruction: hasImage ? PHOTO_INSTRUCTION : SYSTEM_INSTRUCTION,
        parts,
        responseSchema: routineProposalJsonSchema,
      });
    } catch (e) {
      if (e instanceof GeminiUnavailableError) {
        return json({ error: "ai_unavailable", message: e.message }, 503);
      }
      throw e;
    }

    const parsed = routineProposalSchema.safeParse(raw);
    if (!parsed.success) {
      return json({ error: "invalid_ai_response", details: parsed.error.issues }, 502);
    }

    // --- Resolución de nombres contra el catálogo que se le mandó ------
    //
    // Comparación insensible a mayúsculas y acentos, pero NUNCA difusa:
    // un "parecido" acabaría metiendo sentadilla frontal donde el usuario
    // pidió sentadilla búlgara. O es el mismo ejercicio, o no lo es.
    const byNormalized = new Map(entries.map((e) => [normalize(e.name), e]));
    const unmatched = [...parsed.data.unmatched];

    const days = parsed.data.days.map((day) => ({
      name: day.name.slice(0, 60),
      notes: day.notes,
      exercises: day.exercises.flatMap((ex) => {
        const match = byNormalized.get(normalize(ex.exercise_name));
        if (!match) {
          unmatched.push(ex.exercise_name);
          return [];
        }
        return [
          {
            exerciseId: match.id,
            exerciseName: match.name,
            primaryMuscle: match.primary_muscle,
            targetSets: clamp(ex.sets, 1, 20),
            targetRepsMin: clamp(ex.reps_min, 1, 100),
            targetRepsMax: clamp(Math.max(ex.reps_max, ex.reps_min), 1, 100),
            targetRir: ex.rir,
            restSeconds: clamp(ex.rest_seconds, 0, 900),
            notes: ex.notes,
          },
        ];
      }),
    }));

    const warnings = [...parsed.data.warnings];
    const emptyDays = days.filter((d) => d.exercises.length === 0);
    if (emptyDays.length > 0) {
      warnings.push(
        `${emptyDays.length} día(s) se han quedado sin ejercicios porque ninguno de los que propuso existe en el catálogo.`,
      );
    }

    await supabase.from("ai_analyses").insert({
      user_id: user.id,
      analysis_type: "text",
      model: getGeminiModel(),
      input_ref: hasImage ? "[imagen de rutina]" : body.text!.slice(0, 500),
      structured_result: parsed.data,
      confidence: unmatched.length === 0 ? "high" : "medium",
      accepted: false,
    });

    return json(
      {
        name: parsed.data.name.slice(0, 120),
        goal: parsed.data.goal,
        notes: parsed.data.notes,
        rationale: parsed.data.rationale,
        source: hasImage ? "ia_foto" : "ia_chat",
        days: days.filter((d) => d.exercises.length > 0),
        unmatched: [...new Set(unmatched)],
        warnings,
      },
      200,
    );
  } catch (e) {
    if (e instanceof Response) return withCors(e);
    console.error(e);
    return json({ error: "internal_error" }, 500);
  }
});

/** Minúsculas y sin acentos, igual que el trigger de la base de datos. */
function normalize(s: string): string {
  return s
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, Math.round(n)));
}

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
