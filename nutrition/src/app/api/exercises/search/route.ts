import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchExercises } from "@/lib/data/training";
import { isMuscleGroup } from "@/lib/training/muscles";

/**
 * Búsqueda de ejercicios para el selector.
 *
 * Es un Route Handler y no una Server Action porque se llama en cada
 * tecleo: una Server Action es un POST que invalida la caché del router
 * y no se puede cancelar a mitad, así que al teclear rápido las
 * respuestas llegarían desordenadas. Un GET normal se aborta con
 * `AbortController` en cuanto llega la siguiente letra.
 *
 * Sin parámetros propios de autenticación: la sesión va en la cookie y
 * RLS decide qué ve cada uno. Sin sesión, devuelve vacío.
 */
export async function GET(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ exercises: [] }, { status: 401 });

  const { searchParams } = new URL(request.url);
  const muscle = searchParams.get("musculo");
  const equipment = searchParams.get("material");
  const query = searchParams.get("q") ?? "";

  const exercises = await searchExercises(supabase, {
    query: query.slice(0, 80),
    muscle: muscle && isMuscleGroup(muscle) ? muscle : undefined,
    equipment: equipment ?? undefined,
    mineOnly: searchParams.get("mios") === "1",
  }, 120);

  return NextResponse.json(
    { exercises },
    // El catálogo cambia poquísimo, pero es por usuario (incluye los
    // suyos), así que privado y corto.
    { headers: { "Cache-Control": "private, max-age=30" } },
  );
}
