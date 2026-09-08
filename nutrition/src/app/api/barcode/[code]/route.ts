import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { lookupBarcode } from "@/lib/data/open-food-facts";
import { cacheExternalFood } from "@/lib/data/foods-write";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  // Section 12: check our own catalog (already-cached scans) before OFF.
  const { data: cached } = await supabase
    .from("foods")
    .select("*")
    .eq("barcode", code)
    .or(`user_id.is.null,user_id.eq.${user.id}`)
    .limit(1)
    .maybeSingle();
  if (cached) {
    return NextResponse.json({ status: "found", food: cached });
  }

  const result = await lookupBarcode(code);
  if (result.status !== "found") {
    return NextResponse.json(result);
  }

  const food = await cacheExternalFood(supabase, user.id, {
    name: result.food.name,
    brand: result.food.brand,
    source: "open_food_facts",
    barcode: code,
    basis: result.food.basis,
    servingLabel: result.food.servingLabel,
    energyKcal: result.food.energyKcal,
    proteinG: result.food.proteinG,
    carbohydratesG: result.food.carbohydratesG,
    sugarsG: result.food.sugarsG,
    fatG: result.food.fatG,
    saturatedFatG: result.food.saturatedFatG,
    fiberG: result.food.fiberG,
    sodiumMg: result.food.sodiumMg,
    saltG: result.food.saltG,
  });

  return NextResponse.json({ status: "found", food });
}
