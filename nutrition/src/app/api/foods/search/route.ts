import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods } from "@/lib/data/foods";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const results = await searchFoods(supabase, user.id, q);
  return NextResponse.json({ results });
}
