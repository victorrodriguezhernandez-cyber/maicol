// COACH IA (section 32-34). Gemini decides which scoped tools it needs;
// every tool query runs through the user's own RLS-scoped Supabase client,
// so the model can never see another user's data or more of this user's
// data than the tool it invoked actually returns. Tools never write to
// the database — `propose_goal_change` only returns a draft proposal for
// the client to show a confirmation UI for (section 33: no silent writes).
import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { GeminiUnavailableError, getGeminiModel, withGeminiRetry } from "../_shared/gemini.ts";
import { computeTrend, weeklyRate } from "../_shared/trend.ts";
import { todayIso, toLocalDateKey, localDayBoundsUtc } from "../_shared/date.ts";
import { GoogleGenAI, type FunctionDeclaration, Type } from "npm:@google/genai@^1.0.0";
import type { SupabaseClient } from "npm:@supabase/supabase-js@^2.45.0";

interface RequestBody {
  conversationId?: string;
  message: string;
}

// ---------------------------------------------------------------------
// Tool declarations (Gemini function-calling contract)
// ---------------------------------------------------------------------
const tools: FunctionDeclaration[] = [
  { name: "get_current_goals", description: "Objetivos nutricionales y de peso actuales del usuario." },
  { name: "get_today_nutrition", description: "Calorías y macros consumidos hoy, y el objetivo del día." },
  {
    name: "get_day_nutrition",
    description: "Calorías y macros consumidos en una fecha concreta (YYYY-MM-DD).",
    parameters: { type: Type.OBJECT, properties: { date: { type: Type.STRING } }, required: ["date"] },
  },
  {
    name: "calculate_remaining_macros",
    description: "Cuánto le queda hoy al usuario para llegar a sus objetivos de kcal/macros.",
  },
  {
    name: "get_weight_trend",
    description: "Tendencia de peso (EWMA) y ritmo semanal de cambio de los últimos N días.",
    parameters: { type: Type.OBJECT, properties: { days: { type: Type.NUMBER } } },
  },
  {
    name: "get_weight_history",
    description: "Pesajes individuales (peso bruto) de los últimos N días.",
    parameters: { type: Type.OBJECT, properties: { days: { type: Type.NUMBER } } },
  },
  {
    name: "get_weekly_summary",
    description: "Resumen de la semana: kcal/proteína media, adherencia, peso medio y tendencia.",
  },
  {
    name: "get_nutrition_adherence",
    description: "Porcentaje de días de los últimos N que cumplieron el objetivo de kcal, y días completos vs parciales.",
    parameters: { type: Type.OBJECT, properties: { days: { type: Type.NUMBER } } },
  },
  {
    name: "get_macro_history",
    description: "Serie diaria de kcal/proteína/carbohidratos/grasas de los últimos N días.",
    parameters: { type: Type.OBJECT, properties: { days: { type: Type.NUMBER } } },
  },
  {
    name: "search_personal_foods",
    description: "Busca en los alimentos personales (recientes/favoritos/propios) del usuario por nombre.",
    parameters: { type: Type.OBJECT, properties: { query: { type: Type.STRING } }, required: ["query"] },
  },
  {
    name: "get_recent_meals",
    description: "Últimas comidas registradas por el usuario.",
    parameters: { type: Type.OBJECT, properties: { limit: { type: Type.NUMBER } } },
  },
  {
    name: "compare_periods",
    description: "Compara kcal media, proteína media y tendencia de peso entre dos rangos de fechas.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        period_a_start: { type: Type.STRING },
        period_a_end: { type: Type.STRING },
        period_b_start: { type: Type.STRING },
        period_b_end: { type: Type.STRING },
      },
      required: ["period_a_start", "period_a_end", "period_b_start", "period_b_end"],
    },
  },
  {
    name: "propose_goal_change",
    description:
      "Propone un cambio de objetivo (no lo aplica). Úsalo cuando el usuario pida o acepte ajustar sus objetivos. Cambiar el objetivo es una acción importante: la aplicación pedirá confirmación explícita antes de guardarla.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        kcal: { type: Type.NUMBER },
        protein_g: { type: Type.NUMBER },
        carbohydrates_g: { type: Type.NUMBER },
        fat_g: { type: Type.NUMBER },
        reason: { type: Type.STRING },
      },
      required: ["reason"],
    },
  },
  {
    name: "get_meals_on_date",
    description:
      "Comidas registradas (con sus alimentos, ids y valores completos) en una fecha concreta. Úsalo SIEMPRE antes de editar, borrar o duplicar una comida, para tener el meal_id exacto — nunca lo adivines.",
    parameters: { type: Type.OBJECT, properties: { date: { type: Type.STRING } }, required: ["date"] },
  },
  {
    name: "get_weight_entry_on_date",
    description: "El pesaje registrado en una fecha concreta, si existe.",
    parameters: { type: Type.OBJECT, properties: { date: { type: Type.STRING } }, required: ["date"] },
  },
  {
    name: "propose_add_meal_item",
    description:
      "Añade un alimento a una comida de una fecha concreta (crea la comida si ese tipo no existe todavía ese día). Estima tú mismo cantidad y macros del alimento, igual que harías respondiendo en texto — es una acción de bajo riesgo que se ejecuta en cuanto el usuario lo pide, sin confirmación previa.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "YYYY-MM-DD" },
        meal_type: { type: Type.STRING, enum: ["breakfast", "lunch", "dinner", "snack", "other"] },
        food_name: { type: Type.STRING },
        quantity_amount: { type: Type.NUMBER },
        quantity_unit: { type: Type.STRING },
        energy_kcal: { type: Type.NUMBER },
        protein_g: { type: Type.NUMBER },
        carbohydrates_g: { type: Type.NUMBER },
        fat_g: { type: Type.NUMBER },
        fiber_g: { type: Type.NUMBER },
        confidence: { type: Type.STRING, enum: ["high", "medium", "low"] },
        reason: { type: Type.STRING },
      },
      required: [
        "date", "meal_type", "food_name", "quantity_amount", "quantity_unit",
        "energy_kcal", "protein_g", "carbohydrates_g", "fat_g", "reason",
      ],
    },
  },
  {
    name: "propose_update_weight_entry",
    description:
      "Fija el peso de una fecha concreta: corrige el pesaje existente ese día, o crea uno nuevo si no había ninguno. Acción de bajo riesgo, sin confirmación previa.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        date: { type: Type.STRING, description: "YYYY-MM-DD" },
        weight_kg: { type: Type.NUMBER },
        reason: { type: Type.STRING },
      },
      required: ["date", "weight_kg", "reason"],
    },
  },
  {
    name: "propose_delete_meal",
    description:
      "Borra una comida completa (con todos sus alimentos). Usa get_meals_on_date o get_recent_meals primero para obtener el meal_id exacto. Acción destructiva: la aplicación pedirá confirmación antes de ejecutarla.",
    parameters: {
      type: Type.OBJECT,
      properties: { meal_id: { type: Type.STRING }, reason: { type: Type.STRING } },
      required: ["meal_id", "reason"],
    },
  },
  {
    name: "propose_duplicate_meal",
    description:
      "Copia una comida existente a otra fecha, con la misma hora del día y los mismos alimentos (p.ej. 'pon este desayuno también mañana'). Usa get_meals_on_date o get_recent_meals primero para obtener el meal_id exacto. Acción de bajo riesgo, sin confirmación previa.",
    parameters: {
      type: Type.OBJECT,
      properties: {
        meal_id: { type: Type.STRING },
        target_date: { type: Type.STRING, description: "YYYY-MM-DD" },
        reason: { type: Type.STRING },
      },
      required: ["meal_id", "target_date", "reason"],
    },
  },
];

const MEAL_TYPE_LABEL: Record<string, string> = {
  breakfast: "el desayuno",
  lunch: "la comida",
  dinner: "la cena",
  snack: "el snack",
  other: "la comida",
};

function buildSystemInstruction(): string {
  return `Eres el Coach IA de Maicol Nutrición, un asistente personal de nutrición y volumen.

Hoy es ${todayIso()}. Usa esta fecha para resolver expresiones relativas
("hoy", "ayer", "el domingo pasado", "mañana") y conviértelas siempre a
YYYY-MM-DD antes de llamar a cualquier herramienta.

Reglas:
- Responde siempre en español, de forma concisa y directa, como un entrenador que conoce bien los datos del usuario.
- NUNCA inventes cifras sobre datos que ya existen: usa las herramientas de lectura antes de responder cualquier pregunta sobre nutrición, peso o adherencia, y antes de modificar, borrar o duplicar cualquier registro (get_meals_on_date, get_recent_meals, get_weight_entry_on_date) para tener su id exacto — nunca adivines un id.
- Basa cualquier afirmación sobre progreso de peso en la TENDENCIA (get_weight_trend), nunca en un único pesaje.
- Si los datos son insuficientes para responder, o si lo que pide el usuario podría referirse a más de un registro (p.ej. "el desayuno de siempre" sin un patrón claro, o varias comidas que podrían ser la referida), dilo explícitamente y pregunta para confirmar en vez de actuar sobre el registro equivocado.
- Puedes actuar de verdad sobre los datos del usuario con las herramientas "propose_*", no solo explicar cómo hacerlo. Añadir un alimento, duplicar una comida y corregir un peso son acciones de bajo riesgo que la aplicación ejecuta en cuanto las propones. Borrar una comida y cambiar el objetivo son acciones importantes: la aplicación siempre pide confirmación explícita al usuario antes de ejecutarlas, así que puedes proponerlas igualmente en cuanto el usuario lo pida o lo acepte.
- Nunca propongas más de una acción por turno.
- Nunca modifiques nada por tu cuenta fuera de esas herramientas "propose_*" — son el único camino de escritura.
- Cuando menciones proteína, carbohidratos o grasas en tu respuesta, escribe siempre la palabra (o "prot."/"carb."/"grasa", que es como los abrevia la propia app) — nunca una sola letra suelta como "P", "C" o "G".`;
}

Deno.serve(async (req) => {
  const preflight = handleOptions(req);
  if (preflight) return preflight;

  try {
    const { supabase, user } = await requireUser(req);
    const body: RequestBody = await req.json();
    if (!body.message?.trim()) return json({ error: "message_required" }, 400);

    const conversationId = await ensureConversation(supabase, user.id, body.conversationId, body.message);

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "user",
      content: body.message,
    });

    const { data: history } = await supabase
      .from("ai_messages")
      .select("role, content")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true })
      .limit(30);

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) {
      return json({ error: "ai_unavailable", message: "GEMINI_API_KEY is not configured" }, 503);
    }
    const ai = new GoogleGenAI({ apiKey });

    const contents = (history ?? []).map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content ?? "" }],
    }));

    let action: ActionProposal | null = null;
    let finalText = "";
    const toolLog: unknown[] = [];

    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await withGeminiRetry(() =>
        ai.models.generateContent({
          model: getGeminiModel(),
          contents,
          config: { systemInstruction: buildSystemInstruction(), tools: [{ functionDeclarations: tools }] },
        }),
      );

      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        finalText = response.text ?? "";
        break;
      }

      const modelParts = response.candidates?.[0]?.content?.parts ?? [];
      contents.push({ role: "model", parts: modelParts as never });

      const responseParts = [];
      for (const call of calls) {
        if (call.name?.startsWith("propose_")) {
          const built = await buildAction(supabase, user.id, call.name, call.args ?? {});
          if ("error" in built) {
            responseParts.push({ functionResponse: { name: call.name, response: { error: built.error } } });
            continue;
          }
          action = built.action;
          toolLog.push({ name: call.name, args: call.args, action });
          responseParts.push({
            functionResponse: { name: call.name, response: { status: "queued_for_user", risk: built.action.risk } },
          });
          continue;
        }
        const result = await runTool(supabase, user.id, call.name!, call.args ?? {});
        toolLog.push({ name: call.name, args: call.args, result });
        responseParts.push({ functionResponse: { name: call.name!, response: toFunctionResponse(result) } });
      }
      contents.push({ role: "user", parts: responseParts as never });
    }

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalText,
      tool_calls: toolLog.length ? toolLog : null,
    });
    // Bumps updated_at so the conversation list (most-recent-first) reflects
    // this exchange — inserting a message alone doesn't touch the parent row.
    await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId);

    return json({ conversationId, reply: finalText, action }, 200);
  } catch (e) {
    if (e instanceof Response) return withCors(e);
    if (e instanceof GeminiUnavailableError) return json({ error: "ai_unavailable" }, 503);
    console.error(e);
    return json({ error: "internal_error" }, 500);
  }
});

async function ensureConversation(
  supabase: SupabaseClient,
  userId: string,
  conversationId: string | undefined,
  firstMessage: string,
): Promise<string> {
  if (conversationId) return conversationId;
  const { data, error } = await supabase
    .from("ai_conversations")
    .insert({ user_id: userId, title: firstMessage.slice(0, 60) })
    .select("id")
    .single();
  if (error) throw error;
  return data.id as string;
}

// ---------------------------------------------------------------------
// Tool implementations — every query is scoped through the user's own
// RLS-checked client (never the service role).
// ---------------------------------------------------------------------
async function runTool(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<unknown> {
  switch (name) {
    case "get_current_goals":
      return (await supabase.from("nutrition_goals").select("*").eq("user_id", userId).is("effective_to", null).maybeSingle()).data;

    case "get_today_nutrition":
      return dayNutrition(supabase, userId, todayIso());

    case "get_day_nutrition":
      return dayNutrition(supabase, userId, String(args.date));

    case "calculate_remaining_macros": {
      const [goal, totals] = await Promise.all([
        supabase.from("nutrition_goals").select("*").eq("user_id", userId).is("effective_to", null).maybeSingle(),
        dayNutrition(supabase, userId, todayIso()),
      ]);
      const g = goal.data;
      if (!g) return { error: "no_goal_set" };
      return {
        kcal_remaining: g.kcal - totals.kcal,
        protein_g_remaining: g.protein_g - totals.protein_g,
        carbohydrates_g_remaining: g.carbohydrates_g - totals.carbohydrates_g,
        fat_g_remaining: g.fat_g - totals.fat_g,
      };
    }

    case "get_weight_trend": {
      const days = Number(args.days) || 60;
      const entries = await weightEntries(supabase, userId, days);
      const points = computeTrend(entries.map((e) => ({ measuredAt: e.measured_at, weightKg: e.weight_kg })));
      return {
        latest_trend_kg: points.at(-1)?.trendKg ?? null,
        weekly_rate_kg: weeklyRate(points),
        points_count: points.length,
      };
    }

    case "get_weight_history": {
      const days = Number(args.days) || 90;
      return await weightEntries(supabase, userId, days);
    }

    case "get_weekly_summary": {
      const [macroDays, entries, goal] = await Promise.all([
        dailyMacroSeries(supabase, userId, 7),
        weightEntries(supabase, userId, 21),
        supabase.from("nutrition_goals").select("*").eq("user_id", userId).is("effective_to", null).maybeSingle(),
      ]);
      const points = computeTrend(entries.map((e) => ({ measuredAt: e.measured_at, weightKg: e.weight_kg })));
      return {
        avg_kcal: average(macroDays.map((d) => d.kcal)),
        avg_protein_g: average(macroDays.map((d) => d.protein_g)),
        days_logged: macroDays.filter((d) => d.kcal > 0).length,
        weekly_rate_kg: weeklyRate(points),
        goal: goal.data,
      };
    }

    case "get_nutrition_adherence": {
      const days = Number(args.days) || 30;
      const macroDays = await dailyMacroSeries(supabase, userId, days);
      const goal = (await supabase.from("nutrition_goals").select("kcal").eq("user_id", userId).is("effective_to", null).maybeSingle()).data;
      const loggedDays = macroDays.filter((d) => d.kcal > 0);
      const withinTarget = goal
        ? loggedDays.filter((d) => Math.abs(d.kcal - goal.kcal) / goal.kcal <= 0.1).length
        : null;
      return {
        days_analyzed: days,
        days_logged: loggedDays.length,
        days_within_10pct_of_goal: withinTarget,
      };
    }

    case "get_macro_history":
      return await dailyMacroSeries(supabase, userId, Number(args.days) || 30);

    case "search_personal_foods": {
      const { data } = await supabase
        .from("foods")
        .select("id, name, brand, energy_kcal, protein_g")
        .or(`user_id.eq.${userId},user_id.is.null`)
        .ilike("name", `%${String(args.query ?? "")}%`)
        .limit(10);
      return data ?? [];
    }

    case "get_recent_meals": {
      const { data } = await supabase
        .from("meals")
        .select("id, occurred_at, meal_type, meal_items(name, energy_kcal)")
        .eq("user_id", userId)
        .order("occurred_at", { ascending: false })
        .limit(Number(args.limit) || 10);
      return data ?? [];
    }

    case "get_meals_on_date": {
      const { start, end } = localDayBoundsUtc(String(args.date));
      const { data } = await supabase
        .from("meals")
        .select("id, occurred_at, meal_type, name, notes, meal_items(*)")
        .eq("user_id", userId)
        .gte("occurred_at", start)
        .lte("occurred_at", end)
        .order("occurred_at", { ascending: true });
      return (data ?? []).map((meal) => ({ meal_id: meal.id, ...toMealSnapshot(meal) }));
    }

    case "get_weight_entry_on_date": {
      const { start, end } = localDayBoundsUtc(String(args.date));
      const { data } = await supabase
        .from("weight_entries")
        .select("id, measured_at, weight_kg, is_usual_conditions, notes")
        .eq("user_id", userId)
        .gte("measured_at", start)
        .lte("measured_at", end)
        .order("measured_at", { ascending: true })
        .limit(1)
        .maybeSingle();
      return data ?? { found: false };
    }

    case "compare_periods": {
      const [a, b] = await Promise.all([
        periodSummary(supabase, userId, String(args.period_a_start), String(args.period_a_end)),
        periodSummary(supabase, userId, String(args.period_b_start), String(args.period_b_end)),
      ]);
      return { period_a: a, period_b: b };
    }

    default:
      return { error: "unknown_tool" };
  }
}

async function dayNutrition(supabase: SupabaseClient, userId: string, date: string) {
  const { start, end } = localDayBoundsUtc(date);
  const { data: meals } = await supabase
    .from("meals")
    .select("meal_items(energy_kcal, protein_g, carbohydrates_g, fat_g)")
    .eq("user_id", userId)
    .gte("occurred_at", start)
    .lte("occurred_at", end);
  const items = (meals ?? []).flatMap((m) => m.meal_items as Array<{ energy_kcal: number; protein_g: number; carbohydrates_g: number; fat_g: number }>);
  return {
    kcal: sum(items, (i) => i.energy_kcal),
    protein_g: sum(items, (i) => i.protein_g),
    carbohydrates_g: sum(items, (i) => i.carbohydrates_g),
    fat_g: sum(items, (i) => i.fat_g),
  };
}

async function dailyMacroSeries(supabase: SupabaseClient, userId: string, days: number) {
  // Anchored on todayIso() (Europe/Madrid) and walked with UTC-suffixed
  // Date methods — see diary.ts's getRecentDaysSummary (same fix,
  // duplicated here because this Edge Function can't import from src/).
  const todayKey = todayIso();
  const [ty, tm, td] = todayKey.split("-").map(Number);
  const sinceUtc = new Date(Date.UTC(ty, tm - 1, td));
  sinceUtc.setUTCDate(sinceUtc.getUTCDate() - (days - 1));
  const queryFromIso = new Date(sinceUtc.getTime() - 24 * 60 * 60 * 1000).toISOString();

  const { data: meals } = await supabase
    .from("meals")
    .select("occurred_at, meal_items(energy_kcal, protein_g, carbohydrates_g, fat_g)")
    .eq("user_id", userId)
    .gte("occurred_at", queryFromIso);

  const byDay = new Map<string, { kcal: number; protein_g: number; carbohydrates_g: number; fat_g: number }>();
  for (const meal of meals ?? []) {
    const day = toLocalDateKey(meal.occurred_at as string);
    const acc = byDay.get(day) ?? { kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0 };
    for (const item of meal.meal_items as Array<{ energy_kcal: number; protein_g: number; carbohydrates_g: number; fat_g: number }>) {
      acc.kcal += item.energy_kcal;
      acc.protein_g += item.protein_g;
      acc.carbohydrates_g += item.carbohydrates_g;
      acc.fat_g += item.fat_g;
    }
    byDay.set(day, acc);
  }

  const result = [];
  for (let i = 0; i < days; i++) {
    const d = new Date(sinceUtc);
    d.setUTCDate(d.getUTCDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, ...(byDay.get(key) ?? { kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0 }) });
  }
  return result;
}

async function periodSummary(supabase: SupabaseClient, userId: string, start: string, end: string) {
  const startBounds = localDayBoundsUtc(start);
  const endBounds = localDayBoundsUtc(end);
  const { data: meals } = await supabase
    .from("meals")
    .select("meal_items(energy_kcal, protein_g)")
    .eq("user_id", userId)
    .gte("occurred_at", startBounds.start)
    .lte("occurred_at", endBounds.end);
  const items = (meals ?? []).flatMap((m) => m.meal_items as Array<{ energy_kcal: number; protein_g: number }>);

  const { data: weights } = await supabase
    .from("weight_entries")
    .select("measured_at, weight_kg")
    .eq("user_id", userId)
    .gte("measured_at", startBounds.start)
    .lte("measured_at", endBounds.end);
  const points = computeTrend((weights ?? []).map((w) => ({ measuredAt: w.measured_at, weightKg: w.weight_kg })));

  return {
    avg_kcal: sum(items, (i) => i.energy_kcal) / Math.max(1, daysBetween(start, end)),
    avg_protein_g: sum(items, (i) => i.protein_g) / Math.max(1, daysBetween(start, end)),
    weekly_rate_kg: weeklyRate(points, daysBetween(start, end)),
  };
}

async function weightEntries(supabase: SupabaseClient, userId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days);
  const { data } = await supabase
    .from("weight_entries")
    .select("measured_at, weight_kg")
    .eq("user_id", userId)
    .gte("measured_at", since.toISOString())
    .order("measured_at", { ascending: true });
  return data ?? [];
}

function sum<T>(items: T[], fn: (item: T) => number): number {
  return items.reduce((acc, item) => acc + fn(item), 0);
}
function average(values: number[]): number {
  return values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0;
}
function daysBetween(a: string, b: string): number {
  return Math.max(1, Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000));
}

// ---------------------------------------------------------------------
// Action layer — the only path through which the coach ever touches the
// user's data. Every "propose_*" tool call lands here instead of runTool:
// this builds a structured, typed proposal (never a raw DB write) that the
// Next.js client executes via the same validated Server Actions the rest
// of the app uses (createMeal, deleteMeal, addMealItemForDate,
// setWeightEntryForDate, applyGoalChange) — the model never gets a
// database connection of its own. For anything that targets an existing
// row (delete/duplicate a meal), the snapshot is built by fetching that
// row ourselves from the DB (RLS-scoped to this user), never from
// whatever the model claims — so a hallucinated argument can only fail to
// find the row, never silently act on invented data.
// ---------------------------------------------------------------------
interface ActionProposal {
  kind: "add_meal_item" | "update_weight_entry" | "delete_meal" | "duplicate_meal" | "goal_change";
  risk: "safe" | "destructive";
  summary: string;
  payload: Record<string, unknown>;
}

interface MealItemRow {
  food_id: string | null;
  recipe_id: string | null;
  name: string;
  quantity_amount: number;
  quantity_unit: string;
  grams_equivalent: number | null;
  energy_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  sugars_g: number | null;
  fat_g: number;
  saturated_fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  salt_g: number | null;
  micronutrients: Record<string, number> | null;
  precision_level: string;
  source: string;
  confidence: string | null;
  range_kcal_min: number | null;
  range_kcal_max: number | null;
  notes: string | null;
}
interface MealRow {
  id: string;
  occurred_at: string;
  meal_type: string;
  name: string | null;
  notes: string | null;
  meal_items: MealItemRow[];
}

/** Maps a DB meal (+items) row into the exact shape createMeal's
 * CreateMealInput expects, so restoring/duplicating a meal is always just
 * `createMeal(snapshot)` — no separate reconstruction logic to keep in sync. */
function toMealSnapshot(meal: MealRow) {
  return {
    occurredAt: meal.occurred_at,
    mealType: meal.meal_type,
    name: meal.name,
    notes: meal.notes,
    items: (meal.meal_items ?? []).map((it) => ({
      foodId: it.food_id,
      recipeId: it.recipe_id,
      name: it.name,
      quantityAmount: it.quantity_amount,
      quantityUnit: it.quantity_unit,
      gramsEquivalent: it.grams_equivalent,
      energyKcal: it.energy_kcal,
      proteinG: it.protein_g,
      carbohydratesG: it.carbohydrates_g,
      sugarsG: it.sugars_g,
      fatG: it.fat_g,
      saturatedFatG: it.saturated_fat_g,
      fiberG: it.fiber_g,
      sodiumMg: it.sodium_mg,
      saltG: it.salt_g,
      micronutrients: it.micronutrients ?? {},
      precisionLevel: it.precision_level,
      source: it.source,
      confidence: it.confidence,
      rangeKcalMin: it.range_kcal_min,
      rangeKcalMax: it.range_kcal_max,
      notes: it.notes,
    })),
  };
}

async function fetchOwnedMeal(
  supabase: SupabaseClient,
  userId: string,
  mealId: string,
): Promise<MealRow | null> {
  const { data } = await supabase
    .from("meals")
    .select("id, occurred_at, meal_type, name, notes, meal_items(*)")
    .eq("id", mealId)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as MealRow | null) ?? null;
}

async function buildAction(
  supabase: SupabaseClient,
  userId: string,
  name: string,
  args: Record<string, unknown>,
): Promise<{ action: ActionProposal } | { error: string }> {
  switch (name) {
    case "propose_add_meal_item": {
      const date = String(args.date);
      const mealType = String(args.meal_type);
      const item = {
        name: String(args.food_name),
        quantityAmount: Number(args.quantity_amount),
        quantityUnit: String(args.quantity_unit),
        energyKcal: Number(args.energy_kcal),
        proteinG: Number(args.protein_g) || 0,
        carbohydratesG: Number(args.carbohydrates_g) || 0,
        fatG: Number(args.fat_g) || 0,
        fiberG: args.fiber_g != null ? Number(args.fiber_g) : null,
        source: "ai_text_estimation",
        precisionLevel: "estimated",
        confidence: (args.confidence as string) ?? "medium",
      };
      return {
        action: {
          kind: "add_meal_item",
          risk: "safe",
          summary: `Añadido a ${MEAL_TYPE_LABEL[mealType] ?? mealType} del ${date}: ${item.name} (${item.quantityAmount} ${item.quantityUnit})`,
          payload: { date, mealType, item },
        },
      };
    }

    case "propose_update_weight_entry": {
      const date = String(args.date);
      const weightKg = Number(args.weight_kg);
      return {
        action: {
          kind: "update_weight_entry",
          risk: "safe",
          summary: `Peso del ${date} fijado a ${weightKg} kg`,
          payload: { date, weightKg },
        },
      };
    }

    case "propose_delete_meal": {
      const meal = await fetchOwnedMeal(supabase, userId, String(args.meal_id));
      if (!meal) return { error: "meal_not_found" };
      return {
        action: {
          kind: "delete_meal",
          risk: "destructive",
          summary: `Borrar ${MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type} del ${toLocalDateKey(meal.occurred_at)} (${meal.meal_items.length} alimento${meal.meal_items.length === 1 ? "" : "s"})`,
          payload: { mealId: meal.id, snapshot: toMealSnapshot(meal) },
        },
      };
    }

    case "propose_duplicate_meal": {
      const meal = await fetchOwnedMeal(supabase, userId, String(args.meal_id));
      if (!meal) return { error: "meal_not_found" };
      const targetDate = String(args.target_date);
      const timeOfDay = meal.occurred_at.slice(11); // "HH:MM:SS.sssZ" or similar offset
      const snapshot = { ...toMealSnapshot(meal), occurredAt: `${targetDate}T${timeOfDay}` };
      return {
        action: {
          kind: "duplicate_meal",
          risk: "safe",
          summary: `Copiada ${MEAL_TYPE_LABEL[meal.meal_type] ?? meal.meal_type} al ${targetDate}`,
          payload: { snapshot },
        },
      };
    }

    case "propose_goal_change": {
      return {
        action: {
          kind: "goal_change",
          risk: "destructive",
          summary: String(args.reason ?? "Cambiar objetivo"),
          payload: {
            kcal: args.kcal != null ? Number(args.kcal) : undefined,
            proteinG: args.protein_g != null ? Number(args.protein_g) : undefined,
            carbohydratesG: args.carbohydrates_g != null ? Number(args.carbohydrates_g) : undefined,
            fatG: args.fat_g != null ? Number(args.fat_g) : undefined,
            reason: args.reason,
          },
        },
      };
    }

    default:
      return { error: "unknown_action" };
  }
}

// Gemini's FunctionResponse.response field is a Struct — it must be a JSON
// *object*, never a bare array or scalar (several tools here, like
// search_personal_foods or get_recent_meals, return arrays directly; sending
// one as-is fails with "Proto field is not repeating, cannot start list").
function toFunctionResponse(result: unknown): object {
  if (Array.isArray(result)) return { items: result };
  if (result !== null && typeof result === "object") return result as object;
  return { value: result };
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
