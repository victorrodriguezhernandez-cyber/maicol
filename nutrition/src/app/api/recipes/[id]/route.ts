import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getRecipeWithItems } from "@/lib/data/recipes";

export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  try {
    const { recipe, totals } = await getRecipeWithItems(supabase, id);
    return NextResponse.json({ recipe, totals });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
