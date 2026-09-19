import "server-only";
import {
  productoOffAAlimento,
  alimentoUsdaAAlimento,
  CAMPOS_OFF,
  type AlimentoExterno,
} from "@/lib/nutrition/external-mapping";

export type { AlimentoExterno };

/**
 * Buscar alimentos en las bases de datos públicas de composición.
 *
 * ── Por qué hacen falta dos y no una ───────────────────────────────────
 *
 * **Open Food Facts** es un catálogo de PRODUCTOS ENVASADOS: lo que
 * tiene código de barras. Cubre muy bien el súper español (Hacendado,
 * Carrefour, Central Lechera) y es lo que quieres cuando registras algo
 * que venía en un paquete. No tiene clave de API.
 *
 * **USDA FoodData Central** es lo contrario: alimentos GENÉRICOS sin
 * marca — "pollo, pechuga, cruda", "arroz blanco cocido", "aceite de
 * oliva" —, medidos en laboratorio. Es lo que quieres para la comida de
 * verdad, que no lleva etiqueta. Necesita una clave gratuita.
 *
 * Una sola de las dos deja fuera la mitad de lo que come una persona, y
 * por eso las apps grandes también usan varias.
 *
 * ── Reglas que se respetan aquí ────────────────────────────────────────
 *
 * - Ningún dato se supone. Todo pasa por `nutrientes-externos.ts`, que
 *   descarta lo que no sabe convertir en vez de arriesgarse (regla 1: no
 *   inventar un dato nutricional).
 * - Un alimento sin energía o sin nombre no se devuelve. Un resultado
 *   que no se puede registrar sólo estorba en la lista.
 * - Si una fuente falla o tarda, la búsqueda sigue con las demás. Nunca
 *   se queda la pantalla esperando a un servidor de fuera.
 */

/**
 * Open Food Facts pide identificarse en el User-Agent, y es razonable:
 * es un servicio gratuito mantenido por una asociación y así pueden
 * distinguir el tráfico y avisar si algo va mal.
 */
const USER_AGENT = "MaicolNutricion/1.0 (app personal de nutrición)";

/** Un servidor de fuera no puede dejar la pantalla colgada. */
const TIEMPO_MAXIMO_MS = 4000;

async function pedirJson(url: string, opciones: RequestInit = {}): Promise<unknown | null> {
  const corte = AbortSignal.timeout(TIEMPO_MAXIMO_MS);
  try {
    const respuesta = await fetch(url, {
      ...opciones,
      signal: corte,
      headers: { "User-Agent": USER_AGENT, Accept: "application/json", ...opciones.headers },
    });
    if (!respuesta.ok) return null;
    return await respuesta.json();
  } catch {
    // Caída, timeout o JSON roto: la búsqueda sigue sin esta fuente.
    return null;
  }
}

// ─────────────────────────────── Open Food Facts ──────────────────────

/**
 * Busca en Open Food Facts, primero en España.
 *
 * El filtro por país importa más de lo que parece: sin él, "leche
 * entera" devuelve marcas de Argentina y República Dominicana antes que
 * el Hacendado que tienes en la nevera. Si el filtro deja la lista muy
 * corta se repite sin él, porque una marca extranjera encontrada es
 * mejor que ningún resultado.
 */
export async function buscarEnOpenFoodFacts(
  consulta: string,
  limite = 12,
): Promise<AlimentoExterno[]> {
  const termino = consulta.trim();
  if (termino.length < 3) return [];

  const pedir = async (conFiltroDePais: boolean) => {
    const url = new URL("https://search.openfoodfacts.org/search");
    url.searchParams.set("q", conFiltroDePais ? `${termino} countries_tags:"en:spain"` : termino);
    url.searchParams.set("page_size", String(limite));
    url.searchParams.set("fields", CAMPOS_OFF);
    const datos = (await pedirJson(url.toString(), {
      // Teclear vuelve a pedir lo mismo muchas veces; la caché de Next
      // evita machacar un servicio gratuito con la misma consulta.
      next: { revalidate: 3600 },
    })) as { hits?: unknown[] } | null;
    if (!datos?.hits) return [];
    return datos.hits
      .map((h) => productoOffAAlimento(h as Record<string, unknown>))
      .filter((a): a is AlimentoExterno => a !== null);
  };

  const españoles = await pedir(true);
  if (españoles.length >= 4) return españoles;

  const resto = await pedir(false);
  const vistos = new Set(españoles.map((a) => a.idExterno));
  return [...españoles, ...resto.filter((a) => !vistos.has(a.idExterno))].slice(0, limite);
}

/** Un producto concreto por su código de barras, con su ración. */
export async function buscarPorCodigoDeBarras(codigo: string): Promise<AlimentoExterno | null> {
  const limpio = codigo.replace(/\D/g, "");
  if (limpio.length < 8) return null;
  const url = `https://world.openfoodfacts.org/api/v2/product/${limpio}.json?fields=${CAMPOS_OFF},serving_quantity,serving_size`;
  const datos = (await pedirJson(url)) as { product?: Record<string, unknown> } | null;
  if (!datos?.product) return null;
  return productoOffAAlimento(datos.product);
}

// ──────────────────────────────────── USDA ────────────────────────────

/**
 * Busca alimentos genéricos en USDA FoodData Central.
 *
 * Sin `USDA_API_KEY` devuelve una lista vacía y no rompe nada: la
 * búsqueda sigue funcionando con Open Food Facts, y el día que la clave
 * exista esta fuente se enciende sola sin tocar código.
 *
 * Se piden sólo los conjuntos `Foundation` y `SR Legacy`, que son los
 * medidos en laboratorio. `Branded` es el catálogo de marcas de Estados
 * Unidos y aquí no aporta: para productos envasados ya está Open Food
 * Facts, que además tiene los del súper español.
 */
export async function buscarEnUsda(consulta: string, limite = 8): Promise<AlimentoExterno[]> {
  const clave = process.env.USDA_API_KEY;
  if (!clave) return [];
  const termino = consulta.trim();
  if (termino.length < 3) return [];

  const datos = (await pedirJson(
    `https://api.nal.usda.gov/fdc/v1/foods/search?api_key=${encodeURIComponent(clave)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        query: termino,
        dataType: ["Foundation", "SR Legacy"],
        pageSize: limite,
      }),
    },
  )) as { foods?: unknown[] } | null;

  if (!datos?.foods) return [];
  return datos.foods
    .map((f) => alimentoUsdaAAlimento(f as Record<string, unknown>))
    .filter((a): a is AlimentoExterno => a !== null);
}

/**
 * Las dos fuentes a la vez.
 *
 * `allSettled` y no `all`: si Open Food Facts está caído —y lo ha estado
 * esta misma semana, su endpoint viejo devuelve una página de error— la
 * búsqueda sigue devolviendo lo de USDA, y al revés. Que una fuente se
 * caiga no puede dejar el buscador sin resultados.
 */
export async function buscarEnFuentesExternas(consulta: string): Promise<AlimentoExterno[]> {
  const resultados = await Promise.allSettled([
    buscarEnOpenFoodFacts(consulta),
    buscarEnUsda(consulta),
  ]);
  return resultados.flatMap((r) => (r.status === "fulfilled" ? r.value : []));
}
