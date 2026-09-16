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
    // `items` va incluido para poder registrar la receta INGREDIENTE A
    // INGREDIENTE. Antes sólo se mandaban los totales, y con eso la
    // receta sólo podía entrar en el diario como una línea cerrada: no
    // había forma de cambiar el yogur ni de subir los gramos de uno solo.
    const { recipe, items, totals } = await getRecipeWithItems(supabase, id);
    return NextResponse.json({ recipe, items, totals });
  } catch {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
}
