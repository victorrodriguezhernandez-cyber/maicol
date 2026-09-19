import {
  aGramos,
  aKcal,
  aMiligramos,
  construirExtras,
  numeroFinito,
} from "./nutrientes-externos";

/**
 * Convertir la respuesta de una fuente externa en un alimento de la app.
 *
 * Está separado de `lib/data/external-foods.ts` —que es quien hace las
 * peticiones— a propósito: aquí no hay red, así que esto se puede probar
 * con respuestas REALES capturadas de cada API, que es la única forma de
 * saber que las unidades se están leyendo bien. Un test contra un objeto
 * inventado por mí sólo comprobaría que mi idea de la API coincide
 * conmigo mismo.
 */

export interface AlimentoExterno {
  fuente: "open_food_facts" | "usda";
  /** El id en la fuente: el código de barras en OFF, el fdcId en USDA. */
  idExterno: string;
  codigoBarras: string | null;
  nombre: string;
  marca: string | null;
  basis: "per_100g" | "per_100ml";
  servingSizeG: number | null;
  servingLabel: string | null;
  energyKcal: number;
  proteinG: number;
  carbohydratesG: number;
  sugarsG: number | null;
  fatG: number;
  saturatedFatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  saltG: number | null;
  micronutrients: Record<string, number>;
}


export const CAMPOS_OFF = [
  "code",
  "product_name",
  "brands",
  "nutriments",
  "countries_tags",
].join(",");

/**
 * Normaliza un producto de Open Food Facts.
 *
 * Los valores `*_100g` de OFF están siempre en la unidad canónica de su
 * base (gramos para las masas, kcal/kJ para la energía), y la unidad
 * declarada viene aparte en `*_unit`. Se le pasa esa unidad a los
 * conversores en vez de darla por hecha — el sodio es el caso que más
 * duele: viene en GRAMOS y la app lo guarda en miligramos.
 */
export function productoOffAAlimento(producto: Record<string, unknown>): AlimentoExterno | null {
  const nutrientes = (producto.nutriments ?? {}) as Record<string, unknown>;
  const unidad = (clave: string) => nutrientes[`${clave}_unit`] as string | undefined;
  const valor = (clave: string) => nutrientes[`${clave}_100g`];

  const nombre = typeof producto.product_name === "string" ? producto.product_name.trim() : "";
  if (!nombre) return null;

  const energyKcal = aKcal({ kcal: valor("energy-kcal"), kj: valor("energy-kj") });
  // Sin calorías no se puede registrar nada: el resultado sólo estorbaría.
  if (energyKcal == null) return null;

  const proteinG = aGramos(valor("proteins"), unidad("proteins"));
  const carbohydratesG = aGramos(valor("carbohydrates"), unidad("carbohydrates"));
  const fatG = aGramos(valor("fat"), unidad("fat"));
  if (proteinG == null || carbohydratesG == null || fatG == null) return null;

  const codigo = typeof producto.code === "string" ? producto.code : null;
  const marcas = producto.brands;
  const marca = Array.isArray(marcas)
    ? (marcas[0] as string | undefined) ?? null
    : typeof marcas === "string" && marcas.trim()
      ? marcas.split(",")[0].trim()
      : null;

  const racion = numeroFinito(producto.serving_quantity);
  const etiquetaRacion =
    typeof producto.serving_size === "string" && producto.serving_size.trim()
      ? producto.serving_size.trim()
      : null;

  return {
    fuente: "open_food_facts",
    idExterno: codigo ?? nombre,
    codigoBarras: codigo,
    nombre,
    marca,
    // OFF calcula los `_100g` también para los líquidos, donde 100 g y
    // 100 ml no son lo mismo. Distinguirlo bien pide el campo
    // `quantity`, que el índice de búsqueda no devuelve; marcarlo todo
    // como por-100 g es lo que la propia fuente afirma.
    basis: "per_100g",
    servingSizeG: racion != null && racion > 0 ? racion : null,
    servingLabel: etiquetaRacion,
    energyKcal,
    proteinG,
    carbohydratesG,
    sugarsG: aGramos(valor("sugars"), unidad("sugars")),
    fatG,
    saturatedFatG: aGramos(valor("saturated-fat"), unidad("saturated-fat")),
    fiberG: aGramos(valor("fiber"), unidad("fiber")),
    sodiumMg: aMiligramos(valor("sodium"), unidad("sodium")),
    saltG: aGramos(valor("salt"), unidad("salt")),
    micronutrients: construirExtras({
      trans_fat_g: aGramos(valor("trans-fat"), unidad("trans-fat")),
      monounsaturated_fat_g: aGramos(valor("monounsaturated-fat"), unidad("monounsaturated-fat")),
      polyunsaturated_fat_g: aGramos(valor("polyunsaturated-fat"), unidad("polyunsaturated-fat")),
      cholesterol_mg: aMiligramos(valor("cholesterol"), unidad("cholesterol")),
      added_sugars_g: aGramos(valor("added-sugars"), unidad("added-sugars")),
      potassium_mg: aMiligramos(valor("potassium"), unidad("potassium")),
      calcium_mg: aMiligramos(valor("calcium"), unidad("calcium")),
      iron_mg: aMiligramos(valor("iron"), unidad("iron")),
      magnesium_mg: aMiligramos(valor("magnesium"), unidad("magnesium")),
      zinc_mg: aMiligramos(valor("zinc"), unidad("zinc")),
      vitamin_c_mg: aMiligramos(valor("vitamin-c"), unidad("vitamin-c")),
      vitamin_d_mcg: (() => {
        const gramos = aGramos(valor("vitamin-d"), unidad("vitamin-d"));
        return gramos == null ? null : gramos * 1e6;
      })(),
    }),
  };
}


/**
 * Los identificadores de nutriente de USDA. Son números fijos de su
 * sistema y no cambian; el nombre en texto sí cambia entre conjuntos de
 * datos, así que emparejar por número es lo estable.
 */
const NUTRIENTES_USDA: Record<number, { clave: string; unidadEsperada: string }> = {
  1008: { clave: "energyKcal", unidadEsperada: "KCAL" },
  1003: { clave: "proteinG", unidadEsperada: "G" },
  1005: { clave: "carbohydratesG", unidadEsperada: "G" },
  2000: { clave: "sugarsG", unidadEsperada: "G" },
  1004: { clave: "fatG", unidadEsperada: "G" },
  1258: { clave: "saturatedFatG", unidadEsperada: "G" },
  1079: { clave: "fiberG", unidadEsperada: "G" },
  1093: { clave: "sodiumMg", unidadEsperada: "MG" },
  1257: { clave: "trans_fat_g", unidadEsperada: "G" },
  1292: { clave: "monounsaturated_fat_g", unidadEsperada: "G" },
  1293: { clave: "polyunsaturated_fat_g", unidadEsperada: "G" },
  1253: { clave: "cholesterol_mg", unidadEsperada: "MG" },
  1235: { clave: "added_sugars_g", unidadEsperada: "G" },
  1092: { clave: "potassium_mg", unidadEsperada: "MG" },
  1087: { clave: "calcium_mg", unidadEsperada: "MG" },
  1089: { clave: "iron_mg", unidadEsperada: "MG" },
  1090: { clave: "magnesium_mg", unidadEsperada: "MG" },
  1095: { clave: "zinc_mg", unidadEsperada: "MG" },
  1162: { clave: "vitamin_c_mg", unidadEsperada: "MG" },
  1114: { clave: "vitamin_d_mcg", unidadEsperada: "UG" },
};

interface NutrienteUsda {
  nutrientId?: number;
  value?: number;
  unitName?: string;
}

export function alimentoUsdaAAlimento(comida: Record<string, unknown>): AlimentoExterno | null {
  const nombre = typeof comida.description === "string" ? comida.description.trim() : "";
  const fdcId = comida.fdcId;
  if (!nombre || fdcId == null) return null;

  const leidos: Record<string, number> = {};
  for (const bruto of (comida.foodNutrients as NutrienteUsda[] | undefined) ?? []) {
    const definicion = bruto.nutrientId != null ? NUTRIENTES_USDA[bruto.nutrientId] : undefined;
    if (!definicion) continue;
    const valor = numeroFinito(bruto.value);
    if (valor == null || valor < 0) continue;
    // USDA da sus valores por 100 g ya en la unidad que declara. Si
    // alguna vez cambiara, el dato se descarta en vez de colarse mal.
    if ((bruto.unitName ?? "").toUpperCase() !== definicion.unidadEsperada) continue;
    leidos[definicion.clave] = valor;
  }

  const energyKcal = leidos.energyKcal;
  if (energyKcal == null) return null;
  const proteinG = leidos.proteinG;
  const carbohydratesG = leidos.carbohydratesG;
  const fatG = leidos.fatG;
  if (proteinG == null || carbohydratesG == null || fatG == null) return null;

  const marcaBruta = comida.brandOwner ?? comida.brandName;

  return {
    fuente: "usda",
    idExterno: String(fdcId),
    codigoBarras: typeof comida.gtinUpc === "string" ? comida.gtinUpc : null,
    nombre,
    marca: typeof marcaBruta === "string" && marcaBruta.trim() ? marcaBruta.trim() : null,
    basis: "per_100g",
    servingSizeG: null,
    servingLabel: null,
    energyKcal,
    proteinG,
    carbohydratesG,
    sugarsG: leidos.sugarsG ?? null,
    fatG,
    saturatedFatG: leidos.saturatedFatG ?? null,
    fiberG: leidos.fiberG ?? null,
    sodiumMg: leidos.sodiumMg ?? null,
    // USDA no da la sal, da el sodio. Calcularla multiplicando por 2,5
    // sería una conversión de manual aplicada a un dato que la fuente no
    // ha afirmado, así que se deja vacía.
    saltG: null,
    micronutrients: construirExtras({
      trans_fat_g: leidos.trans_fat_g ?? null,
      monounsaturated_fat_g: leidos.monounsaturated_fat_g ?? null,
      polyunsaturated_fat_g: leidos.polyunsaturated_fat_g ?? null,
      cholesterol_mg: leidos.cholesterol_mg ?? null,
      added_sugars_g: leidos.added_sugars_g ?? null,
      potassium_mg: leidos.potassium_mg ?? null,
      calcium_mg: leidos.calcium_mg ?? null,
      iron_mg: leidos.iron_mg ?? null,
      magnesium_mg: leidos.magnesium_mg ?? null,
      zinc_mg: leidos.zinc_mg ?? null,
      vitamin_c_mg: leidos.vitamin_c_mg ?? null,
      vitamin_d_mcg: leidos.vitamin_d_mcg ?? null,
    }),
  };
}

