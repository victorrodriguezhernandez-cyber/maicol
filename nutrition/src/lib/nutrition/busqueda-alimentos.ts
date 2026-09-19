import type { FoodRow } from "@/lib/supabase/types";
import type { AlimentoExterno } from "./external-mapping";

/**
 * Un resultado del buscador, venga de donde venga.
 *
 * La pantalla no debería tener que saber si un alimento estaba ya en tu
 * catálogo o acaba de llegar de Open Food Facts — lo pinta igual. Lo que
 * sí cambia es qué pasa al tocarlo: uno tuyo se añade directo, y uno de
 * fuera se guarda antes en tu catálogo para que la próxima vez sea tuyo
 * (ver `guardarAlimentoExterno`).
 *
 * Por eso el tipo es una unión discriminada por `origen` en vez de un
 * objeto con todo opcional: así el compilador no deja escribir la rama
 * de "añadir" sin decidir cuál de los dos casos estás tratando.
 */
export type MotivoDeResultado =
  | "recent"
  | "favorite"
  | "custom"
  | "catalog"
  | "open_food_facts"
  | "usda";

interface Comun {
  /** Estable y único, para la `key` de React y para quitar duplicados. */
  clave: string;
  motivo: MotivoDeResultado;
  nombre: string;
  marca: string | null;
  energyKcal: number;
  basis: "per_100g" | "per_100ml";
  /**
   * Cuántas marcas más decían exactamente lo mismo y se han agrupado
   * detrás de ésta. Se enseña en la fila: esconderlas en silencio sería
   * hacerle creer que el catálogo tiene menos de lo que tiene.
   */
  repetidos?: number;
}

export type ResultadoBusqueda =
  | (Comun & { origen: "local"; food: FoodRow })
  | (Comun & { origen: "externo"; externo: AlimentoExterno });

/**
 * De dónde ha salido cada resultado, dicho en la pantalla.
 *
 * Que se vea la fuente no es decoración: un alimento de USDA está medido
 * en laboratorio y uno de Open Food Facts lo ha subido alguien copiando
 * una etiqueta. Saber cuál estás cogiendo es parte de poder confiar en
 * el número (regla 9).
 */
/**
 * Cómo se nombra un resultado que representa a varias marcas.
 *
 * Cuando el grupo tiene una sola marca, se enseña: es ESE producto.
 * Cuando agrupa varias, la marca concreta se calla — poner "· Sello
 * Rojo" al lado de una fila que representa a nueve marcas insinúa que
 * ese es el producto que vas a registrar, y no lo es más que los otros
 * ocho. Lo honesto es decir cuántas hay.
 */
export function sufijoDeMarca(marca: string | null, repetidos = 0): string {
  if (repetidos > 0) {
    const total = repetidos + 1;
    return ` · ${total} marcas con los mismos valores`;
  }
  return marca ? ` · ${marca}` : "";
}

export const ETIQUETA_DE_MOTIVO: Record<MotivoDeResultado, string> = {
  favorite: "Favorito",
  recent: "Reciente",
  custom: "Tuyo",
  catalog: "Catálogo",
  open_food_facts: "Open Food Facts",
  usda: "USDA",
};
