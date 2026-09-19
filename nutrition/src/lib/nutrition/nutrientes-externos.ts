
/**
 * Pasar lo que devuelve una fuente externa a las unidades de esta app.
 *
 * ── Por qué esto es su propio módulo, puro y con tests ─────────────────
 *
 * Aquí vive el único error que puede meter un dato nutricional falso sin
 * que nadie lo note: la unidad. Open Food Facts devuelve el sodio en
 * GRAMOS (`sodium_100g: 0.159`) y la columna de la app es `sodium_mg`.
 * Copiar el número tal cual no da ningún error — da 0,159 mg de sodio en
 * vez de 159, mil veces menos, y la cifra se queda ahí para siempre con
 * pinta de correcta. Eso es exactamente lo que la regla 1 prohíbe: un
 * dato inventado donde había uno bueno.
 *
 * La defensa es no suponer nunca. Cada conversión declara de qué unidad
 * a qué unidad va, y DESCARTA lo que no sabe interpretar en vez de
 * arriesgarse. Un nutriente que falta se ve en pantalla y se puede
 * rellenar a mano; uno equivocado por mil no se ve.
 */

/** Las unidades que sabemos interpretar. Cualquier otra se descarta. */
const FACTORES_A_GRAMO: Record<string, number> = {
  g: 1,
  gr: 1,
  grams: 1,
  mg: 1e-3,
  µg: 1e-6,
  μg: 1e-6, // micro griega, distinta del signo micro de arriba
  mcg: 1e-6,
  ug: 1e-6,
};

/** Un número de verdad, o null. `Number("")` es 0 y eso no vale aquí. */
export function numeroFinito(valor: unknown): number | null {
  if (typeof valor === "number") return Number.isFinite(valor) ? valor : null;
  if (typeof valor === "string" && valor.trim() !== "") {
    const n = Number(valor.replace(",", "."));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/**
 * Convierte una masa a gramos. `null` si el valor no es un número o la
 * unidad no está en la tabla: preferimos no tener el dato a tenerlo mal.
 */
export function aGramos(valor: unknown, unidad: string | undefined | null): number | null {
  const n = numeroFinito(valor);
  if (n == null || n < 0) return null;
  const factor = FACTORES_A_GRAMO[(unidad ?? "g").trim().toLowerCase()];
  return factor == null ? null : n * factor;
}

/** Lo mismo en miligramos, que es como guarda la app el sodio. */
export function aMiligramos(valor: unknown, unidad: string | undefined | null): number | null {
  const gramos = aGramos(valor, unidad);
  return gramos == null ? null : gramos * 1000;
}

/**
 * Energía en kcal.
 *
 * Muchos productos traen sólo los kilojulios, que es lo que obliga la
 * etiqueta europea. 1 kcal = 4,184 kJ (la kilocaloría termoquímica, que
 * es la que usa el etiquetado); dividir es exacto y no inventa nada,
 * así que es mejor que quedarse sin el dato.
 */
export const KJ_POR_KCAL = 4.184;

export function aKcal({ kcal, kj }: { kcal?: unknown; kj?: unknown }): number | null {
  const directo = numeroFinito(kcal);
  if (directo != null && directo >= 0) return directo;
  const kilojulios = numeroFinito(kj);
  if (kilojulios == null || kilojulios < 0) return null;
  return kilojulios / KJ_POR_KCAL;
}

/**
 * El panel de nutrientes más allá de los cuatro macros.
 *
 * Son los que enseñan MyFitnessPal y compañía, y los que trae una
 * etiqueta europea. Van al jsonb `micronutrients`, que acepta claves
 * libres: añadirlos no necesita ninguna migración, y una fuente que no
 * traiga uno simplemente no lo pone.
 */
export const NUTRIENTES_EXTRA = [
  { clave: "trans_fat_g", etiqueta: "Grasas trans", unidad: "g" },
  { clave: "monounsaturated_fat_g", etiqueta: "Monoinsaturadas", unidad: "g" },
  { clave: "polyunsaturated_fat_g", etiqueta: "Poliinsaturadas", unidad: "g" },
  { clave: "cholesterol_mg", etiqueta: "Colesterol", unidad: "mg" },
  { clave: "added_sugars_g", etiqueta: "Azúcares añadidos", unidad: "g" },
  { clave: "potassium_mg", etiqueta: "Potasio", unidad: "mg" },
  { clave: "calcium_mg", etiqueta: "Calcio", unidad: "mg" },
  { clave: "iron_mg", etiqueta: "Hierro", unidad: "mg" },
  { clave: "magnesium_mg", etiqueta: "Magnesio", unidad: "mg" },
  { clave: "zinc_mg", etiqueta: "Zinc", unidad: "mg" },
  { clave: "vitamin_c_mg", etiqueta: "Vitamina C", unidad: "mg" },
  { clave: "vitamin_d_mcg", etiqueta: "Vitamina D", unidad: "µg" },
] as const;

export type ClaveNutrienteExtra = (typeof NUTRIENTES_EXTRA)[number]["clave"];

/**
 * Monta el jsonb de extras descartando lo que falte o no se entienda.
 *
 * Nunca mete un 0 por "no venía": un cero dicho por la app es una
 * afirmación ("este alimento no tiene colesterol") y no es lo mismo que
 * no saberlo. Sólo entra lo que la fuente ha dicho de verdad.
 */
export function construirExtras(
  entradas: Partial<Record<ClaveNutrienteExtra, number | null>>,
): Record<string, number> {
  const extras: Record<string, number> = {};
  for (const { clave } of NUTRIENTES_EXTRA) {
    const valor = entradas[clave];
    if (valor != null && Number.isFinite(valor) && valor >= 0) extras[clave] = valor;
  }
  return extras;
}
