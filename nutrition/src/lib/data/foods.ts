import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { FoodRow } from "@/lib/supabase/types";

export interface SearchedFood extends FoodRow {
  /** Why this row is ranked where it is — surfaced in the UI. */
  rankReason: "recent" | "favorite" | "custom" | "catalog";
  timesUsed?: number;
}

/**
 * Unified food search (section 16): recent/favorite/custom foods the user
 * already relies on are always shown before the generic global catalog,
 * even when the global match is textually closer.
 */
export async function searchFoods(
  supabase: SupabaseClient,
  userId: string,
  query: string,
  limit = 25,
): Promise<SearchedFood[]> {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return getRecentAndFavoriteFoods(supabase, userId, limit);
  }

  const [personalResult, globalResult, statsResult, favoritesResult] = await Promise.all([
    supabase
      .from("foods")
      .select("*")
      .eq("user_id", userId)
      .ilike("name", `%${trimmed}%`)
      .limit(limit),
    supabase
      .from("foods")
      .select("*")
      .is("user_id", null)
      .ilike("name", `%${trimmed}%`)
      .limit(limit),
    supabase.from("user_food_stats").select("food_id, times_used").eq("user_id", userId),
    supabase.from("favorites").select("food_id").eq("user_id", userId),
  ]);

  if (personalResult.error) throw personalResult.error;
  if (globalResult.error) throw globalResult.error;

  const statsByFood = new Map((statsResult.data ?? []).map((s) => [s.food_id, s.times_used]));
  const favoriteIds = new Set((favoritesResult.data ?? []).map((f) => f.food_id));

  const personal: SearchedFood[] = (personalResult.data ?? []).map((f) => ({
    ...f,
    rankReason: favoriteIds.has(f.id) ? "favorite" : "custom",
    timesUsed: statsByFood.get(f.id),
  }));
  const global: SearchedFood[] = (globalResult.data ?? []).map((f) => ({
    ...f,
    rankReason: (favoriteIds.has(f.id) ? "favorite" : statsByFood.has(f.id) ? "recent" : "catalog") as SearchedFood["rankReason"],
    timesUsed: statsByFood.get(f.id),
  }));

  const combined = [...personal, ...global];
  combined.sort((a, b) => {
    const rank = (f: SearchedFood) =>
      f.rankReason === "favorite" ? 0 : f.rankReason === "recent" ? 1 : f.rankReason === "custom" ? 2 : 3;
    const rankDiff = rank(a) - rank(b);
    if (rankDiff !== 0) return rankDiff;
    return (b.timesUsed ?? 0) - (a.timesUsed ?? 0);
  });

  // De-duplicate (a food could theoretically appear from both queries only
  // if user_id null vs set collide, which cannot happen, but be defensive).
  const seen = new Set<string>();
  return combined.filter((f) => (seen.has(f.id) ? false : (seen.add(f.id), true))).slice(0, limit);
}

export async function getRecentAndFavoriteFoods(
  supabase: SupabaseClient,
  userId: string,
  limit = 25,
): Promise<SearchedFood[]> {
  const { data: stats, error } = await supabase
    .from("user_food_stats")
    .select("food_id, times_used, last_used_at, foods(*)")
    .eq("user_id", userId)
    .order("last_used_at", { ascending: false })
    .limit(limit);
  if (error) throw error;

  const { data: favorites } = await supabase
    .from("favorites")
    .select("food_id")
    .eq("user_id", userId)
    .not("food_id", "is", null);
  const favoriteIds = new Set((favorites ?? []).map((f) => f.food_id));

  return (stats ?? [])
    .filter((s) => s.foods)
    .map((s) => ({
      ...(s.foods as unknown as FoodRow),
      rankReason: (favoriteIds.has(s.food_id) ? "favorite" : "recent") as SearchedFood["rankReason"],
      timesUsed: s.times_used,
    }));
}
