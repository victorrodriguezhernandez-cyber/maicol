import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { listRecipes } from "@/lib/data/recipes";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const recipes = await listRecipes(supabase, user.id);
  return NextResponse.json({ recipes });
}
