// COACH IA (section 32-34). Gemini decides which scoped tools it needs;
// every tool query runs through the user's own RLS-scoped Supabase client,
// so the model can never see another user's data or more of this user's
// data than the tool it invoked actually returns. Tools never write to
// the database — `propose_goal_change` only returns a draft proposal for
// the client to show a confirmation UI for (section 33: no silent writes).
import { handleOptions, corsHeaders } from "../_shared/cors.ts";
import { requireUser } from "../_shared/auth.ts";
import { GeminiUnavailableError, getGeminiModel } from "../_shared/gemini.ts";
import { computeTrend, weeklyRate } from "../_shared/trend.ts";
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
      "Propone un cambio de objetivo (no lo aplica). Úsalo cuando el usuario pida o acepte ajustar sus objetivos. El usuario deberá confirmar explícitamente en la app.",
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
];

const SYSTEM_INSTRUCTION = `Eres el Coach IA de Maicol Nutrición, un asistente personal de nutrición y volumen.

Reglas:
- Responde siempre en español, de forma concisa y directa, como un entrenador que conoce bien los datos del usuario.
- NUNCA inventes cifras: usa las herramientas disponibles para consultar los datos reales del usuario antes de responder cualquier pregunta sobre su nutrición, peso o adherencia.
- Basa cualquier afirmación sobre progreso de peso en la TENDENCIA (get_weight_trend), nunca en un único pesaje.
- Si los datos son insuficientes para responder con confianza, dilo explícitamente en vez de adivinar.
- Nunca modifiques objetivos, comidas o pesos directamente. Si el usuario quiere cambiar un objetivo, usa "propose_goal_change" para proponerlo — la aplicación se lo confirmará al usuario antes de guardar nada.`;

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

    let proposedAction: unknown = null;
    let finalText = "";
    const toolLog: unknown[] = [];

    for (let iteration = 0; iteration < 5; iteration++) {
      const response = await ai.models.generateContent({
        model: getGeminiModel(),
        contents,
        config: { systemInstruction: SYSTEM_INSTRUCTION, tools: [{ functionDeclarations: tools }] },
      });

      const calls = response.functionCalls ?? [];
      if (calls.length === 0) {
        finalText = response.text ?? "";
        break;
      }

      const modelParts = response.candidates?.[0]?.content?.parts ?? [];
      contents.push({ role: "model", parts: modelParts as never });

      const responseParts = [];
      for (const call of calls) {
        if (call.name === "propose_goal_change") {
          proposedAction = { type: "goal_change", ...call.args };
          responseParts.push({
            functionResponse: {
              name: call.name,
              response: { status: "proposed_to_user_pending_confirmation" },
            },
          });
          continue;
        }
        const result = await runTool(supabase, user.id, call.name!, call.args ?? {});
        toolLog.push({ name: call.name, args: call.args, result });
        responseParts.push({ functionResponse: { name: call.name!, response: result as object } });
      }
      contents.push({ role: "user", parts: responseParts as never });
    }

    await supabase.from("ai_messages").insert({
      conversation_id: conversationId,
      role: "assistant",
      content: finalText,
      tool_calls: toolLog.length ? toolLog : null,
    });

    return json({ conversationId, reply: finalText, proposedAction }, 200);
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
  const { data: meals } = await supabase
    .from("meals")
    .select("meal_items(energy_kcal, protein_g, carbohydrates_g, fat_g)")
    .eq("user_id", userId)
    .gte("occurred_at", `${date}T00:00:00`)
    .lte("occurred_at", `${date}T23:59:59.999`);
  const items = (meals ?? []).flatMap((m) => m.meal_items as Array<{ energy_kcal: number; protein_g: number; carbohydrates_g: number; fat_g: number }>);
  return {
    kcal: sum(items, (i) => i.energy_kcal),
    protein_g: sum(items, (i) => i.protein_g),
    carbohydrates_g: sum(items, (i) => i.carbohydrates_g),
    fat_g: sum(items, (i) => i.fat_g),
  };
}

async function dailyMacroSeries(supabase: SupabaseClient, userId: string, days: number) {
  const since = new Date();
  since.setDate(since.getDate() - days + 1);
  const { data: meals } = await supabase
    .from("meals")
    .select("occurred_at, meal_items(energy_kcal, protein_g, carbohydrates_g, fat_g)")
    .eq("user_id", userId)
    .gte("occurred_at", since.toISOString());

  const byDay = new Map<string, { kcal: number; protein_g: number; carbohydrates_g: number; fat_g: number }>();
  for (const meal of meals ?? []) {
    const day = (meal.occurred_at as string).slice(0, 10);
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
    const d = new Date(since);
    d.setDate(d.getDate() + i);
    const key = d.toISOString().slice(0, 10);
    result.push({ date: key, ...(byDay.get(key) ?? { kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0 }) });
  }
  return result;
}

async function periodSummary(supabase: SupabaseClient, userId: string, start: string, end: string) {
  const { data: meals } = await supabase
    .from("meals")
    .select("meal_items(energy_kcal, protein_g)")
    .eq("user_id", userId)
    .gte("occurred_at", `${start}T00:00:00`)
    .lte("occurred_at", `${end}T23:59:59.999`);
  const items = (meals ?? []).flatMap((m) => m.meal_items as Array<{ energy_kcal: number; protein_g: number }>);

  const { data: weights } = await supabase
    .from("weight_entries")
    .select("measured_at, weight_kg")
    .eq("user_id", userId)
    .gte("measured_at", `${start}T00:00:00`)
    .lte("measured_at", `${end}T23:59:59.999`);
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
function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
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
