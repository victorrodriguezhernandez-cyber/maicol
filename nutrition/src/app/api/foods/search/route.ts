import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { searchFoods } from "@/lib/data/foods";
import { buscarEnFuentesExternas } from "@/lib/data/external-foods";
import type { ResultadoBusqueda } from "@/lib/nutrition/busqueda-alimentos";

/**
 * Buscar un alimento: primero los tuyos, luego el mundo.
 *
 * Hasta ahora esto sólo miraba la tabla `foods`, que estaba VACÍA — así
 * que el buscador no devolvía nada escribieras lo que escribieras. Ahora
 * consulta además Open Food Facts (productos del súper) y USDA
 * (alimentos genéricos), que es lo que hacen las apps grandes.
 *
 * El orden no es negociable: lo tuyo va delante SIEMPRE. Un alimento que
 * ya has registrado veinte veces es casi seguro el que buscas otra vez,
 * y tenerlo que pescar entre cincuenta marcas de un catálogo mundial
 * sería un paso atrás aunque hubiera más resultados.
 *
 * Las fuentes externas nunca bloquean: si tardan o se caen, la búsqueda
 * devuelve lo local y ya está (ver `buscarEnFuentesExternas`).
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthenticated" }, { status: 401 });

  const q = request.nextUrl.searchParams.get("q") ?? "";
  const locales = await searchFoods(supabase, user.id, q);

  const resultados: ResultadoBusqueda[] = locales.map((f) => ({
    clave: f.id,
    origen: "local",
    motivo: f.rankReason,
    nombre: f.name,
    marca: f.brand,
    energyKcal: f.energy_kcal,
    basis: f.basis === "per_100ml" ? "per_100ml" : "per_100g",
    food: f,
  }));

  // Con menos de tres letras no se sale a buscar fuera: "le" devolvería
  // media base de datos y gastaría una petición a un servicio gratuito
  // por cada tecla.
  if (q.trim().length >= 3) {
    const externos = await buscarEnFuentesExternas(q);
    // Lo que ya tienes guardado no se repite abajo como resultado de
    // fuera: sería la misma leche dos veces, una tuya y otra del
    // catálogo mundial.
    const idsGuardados = new Set(
      locales.map((f) => (f.external_id ? `${f.source}:${f.external_id}` : f.id)),
    );
    for (const { alimento, repetidos } of externos) {
      const clave = `${alimento.fuente}:${alimento.idExterno}`;
      if (idsGuardados.has(clave)) continue;
      resultados.push({
        clave,
        origen: "externo",
        motivo: alimento.fuente,
        nombre: alimento.nombre,
        marca: alimento.marca,
        energyKcal: alimento.energyKcal,
        basis: alimento.basis,
        repetidos,
        externo: alimento,
      });
    }
  }

  return NextResponse.json({ results: resultados });
}
