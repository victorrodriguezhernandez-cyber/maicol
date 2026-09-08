import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Section 56: the app never locks a user into its own format. Exports
 * everything meaningful about their data — meals/foods/weight/measurements
 * /goals — as either a single JSON document or a small set of CSV tables.
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const format = request.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";

  const [meals, foods, weights, measurements, goals] = await Promise.all([
    supabase
      .from("meals")
      .select("*, meal_items(*)")
      .eq("user_id", user.id)
      .order("occurred_at", { ascending: true }),
    supabase.from("foods").select("*").eq("user_id", user.id),
    supabase.from("weight_entries").select("*").eq("user_id", user.id).order("measured_at", { ascending: true }),
    supabase.from("body_measurements").select("*").eq("user_id", user.id).order("measured_at", { ascending: true }),
    supabase.from("nutrition_goals").select("*").eq("user_id", user.id).order("effective_from", { ascending: true }),
  ]);

  const payload = {
    exported_at: new Date().toISOString(),
    meals: meals.data ?? [],
    foods: foods.data ?? [],
    weight_entries: weights.data ?? [],
    body_measurements: measurements.data ?? [],
    nutrition_goals: goals.data ?? [],
  };

  if (format === "json") {
    return new NextResponse(JSON.stringify(payload, null, 2), {
      headers: {
        "content-type": "application/json",
        "content-disposition": `attachment; filename="maicol-export-${todayStamp()}.json"`,
      },
    });
  }

  const csv = buildCsvBundle(payload);
  return new NextResponse(csv, {
    headers: {
      "content-type": "text/csv",
      "content-disposition": `attachment; filename="maicol-export-${todayStamp()}.csv"`,
    },
  });
}

function todayStamp(): string {
  return new Date().toISOString().slice(0, 10);
}

function csvEscape(value: unknown): string {
  if (value == null) return "";
  const s = typeof value === "object" ? JSON.stringify(value) : String(value);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

function toCsvTable(title: string, rows: Record<string, unknown>[]): string {
  if (rows.length === 0) return `# ${title}\n(sin datos)\n`;
  const headers = Object.keys(rows[0]);
  const lines = [
    `# ${title}`,
    headers.join(","),
    ...rows.map((row) => headers.map((h) => csvEscape(row[h])).join(",")),
  ];
  return lines.join("\n") + "\n";
}

function buildCsvBundle(payload: {
  meals: Array<Record<string, unknown>>;
  foods: Array<Record<string, unknown>>;
  weight_entries: Array<Record<string, unknown>>;
  body_measurements: Array<Record<string, unknown>>;
  nutrition_goals: Array<Record<string, unknown>>;
}): string {
  const mealItems = payload.meals.flatMap((m) =>
    ((m.meal_items as Record<string, unknown>[]) ?? []).map((item) => ({
      meal_id: m.id,
      occurred_at: m.occurred_at,
      meal_type: m.meal_type,
      ...item,
    })),
  );

  return [
    toCsvTable("meal_items", mealItems),
    toCsvTable("foods", payload.foods),
    toCsvTable("weight_entries", payload.weight_entries),
    toCsvTable("body_measurements", payload.body_measurements),
    toCsvTable("nutrition_goals", payload.nutrition_goals),
  ].join("\n");
}
