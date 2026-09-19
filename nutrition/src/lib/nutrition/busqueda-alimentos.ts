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
export const ETIQUETA_DE_MOTIVO: Record<MotivoDeResultado, string> = {
  favorite: "Favorito",
  recent: "Reciente",
  custom: "Tuyo",
  catalog: "Catálogo",
  open_food_facts: "Open Food Facts",
  usda: "USDA",
};
