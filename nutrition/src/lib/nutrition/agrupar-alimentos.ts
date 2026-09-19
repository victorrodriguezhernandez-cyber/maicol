/**
 * Quitar de la lista de resultados lo que es la misma cosa repetida.
 *
 * ── El problema ────────────────────────────────────────────────────────
 *
 * Buscar "leche entera" en un catálogo mundial devuelve la misma leche
 * nueve veces: Pascual, Puleva, Leyma, superSol, Hacendado… todas con
 * 63-64 kcal y los mismos macros. Elijas la que elijas, tu diario apunta
 * los mismos números, así que las ocho de más no son opciones: son ocho
 * filas que te hacen leer lo mismo otra vez para volver a decidir nada.
 *
 * Lo que SÍ tiene que seguir apareciendo es lo que de verdad es otro
 * alimento: la desnatada, la proteica, la sin lactosa. Esas no son la
 * misma leche con otro logo — dan números distintos.
 *
 * ── La regla, para poder discutirla (regla 9) ──────────────────────────
 *
 * Dos resultados son el mismo alimento cuando se cumplen LAS DOS cosas:
 *
 *   1. Hablan de lo mismo: la primera palabra con contenido del nombre
 *      más corto aparece también en el otro. "Leche entera" y "Leche
 *      entrera UHT" (con la errata incluida) comparten «leche»; "Yogur
 *      natural" y "Kéfir natural" no comparten nada una vez quitado el
 *      relleno.
 *
 *   2. Sus valores por 100 g son indistinguibles: la energía dentro de 5
 *      kcal y cada macro dentro de 0,7 g. Ese margen es más pequeño que
 *      la diferencia entre una leche entera y una semidesnatada (17 kcal)
 *      o entre un yogur normal y uno proteico (más de 2 g de proteína),
 *      así que esas nunca se juntan.
 *
 * De cada grupo se enseña el que MÁS datos trae, porque es del que más
 * se aprende, y se dice cuántos se han quedado detrás. No se esconde
 * nada en silencio.
 */

export interface AlimentoAgrupable {
  nombre: string;
  marca: string | null;
  energyKcal: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  sugarsG?: number | null;
  saturatedFatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  saltG?: number | null;
  micronutrients?: Record<string, number> | null;
}

const MARGEN_KCAL = 5;
const MARGEN_MACRO_G = 0.7;

/**
 * Palabras que no dicen qué alimento es.
 *
 * Van fuera antes de comparar nombres: si no, "Leche UHT brik 1 L" y
 * "Leche" parecerían cosas distintas por culpa del envase. Ojo con lo
 * que NO está aquí — "natural", "entera", "desnatada" o "proteico" sí
 * distinguen un alimento de otro y se quedan.
 */
const RELLENO = new Set([
  "de", "del", "la", "el", "los", "las", "con", "sin", "y", "en", "al", "a",
  "uht", "brik", "pack", "bote", "botella", "tarrina", "envase", "unidades",
  "ml", "cl", "l", "g", "kg", "gr", "gramos", "litro", "litros",
  "producto", "alimento", "marca", "codigo", "ref",
]);

/** Sin acentos, sin signos y sin números: sólo las palabras. */
function palabras(texto: string): string[] {
  return texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/**
 * Las palabras del nombre que de verdad dicen qué es, quitando el
 * relleno y la marca — que ya sale aparte en la pantalla y sólo estorba
 * al comparar ("Puleva Leche Entera" contra "Leche entera").
 */
export function palabrasDeContenido(nombre: string, marca: string | null): string[] {
  const deMarca = new Set(marca ? palabras(marca) : []);
  return palabras(nombre).filter((p) => p.length > 2 && !RELLENO.has(p) && !deMarca.has(p));
}

/** ¿Los dos nombres hablan del mismo alimento? */
function hablanDeLoMismo(a: AlimentoAgrupable, b: AlimentoAgrupable): boolean {
  const pa = palabrasDeContenido(a.nombre, a.marca);
  const pb = palabrasDeContenido(b.nombre, b.marca);
  if (pa.length === 0 || pb.length === 0) return false;
  // La primera palabra del nombre más corto es casi siempre el alimento
  // ("leche entera desnatada" → leche). Se exige que esa aparezca en el
  // otro, no un parecido cualquiera: "yogur" y "kéfir" no se mezclan por
  // compartir "natural".
  const [corto, largo] = pa.length <= pb.length ? [pa, pb] : [pb, pa];
  return largo.includes(corto[0]);
}

/** ¿Dan los mismos números en el diario? */
function mismosNumeros(a: AlimentoAgrupable, b: AlimentoAgrupable): boolean {
  return (
    Math.abs(a.energyKcal - b.energyKcal) <= MARGEN_KCAL &&
    Math.abs(a.proteinG - b.proteinG) <= MARGEN_MACRO_G &&
    Math.abs(a.carbohydratesG - b.carbohydratesG) <= MARGEN_MACRO_G &&
    Math.abs(a.fatG - b.fatG) <= MARGEN_MACRO_G
  );
}

/** Cuántos nutrientes trae: de ahí sale quién representa al grupo. */
function cuantosDatosTrae(a: AlimentoAgrupable): number {
  const opcionales = [a.sugarsG, a.saturatedFatG, a.fiberG, a.sodiumMg, a.saltG];
  return (
    opcionales.filter((v) => v != null).length +
    Object.keys(a.micronutrients ?? {}).length
  );
}

export interface Agrupado<T> {
  alimento: T;
  /** Cuántos resultados más decían exactamente lo mismo. */
  repetidos: number;
}

/**
 * Agrupa una lista de resultados y devuelve un representante por grupo,
 * manteniendo el orden en el que llegaron (que es el de relevancia de la
 * fuente: reordenarlo por nuestra cuenta sería opinar sobre qué es más
 * relevante sin tener con qué).
 */
export function agruparAlimentos<T extends AlimentoAgrupable>(alimentos: T[]): Agrupado<T>[] {
  const grupos: { miembros: T[] }[] = [];

  for (const alimento of alimentos) {
    const grupo = grupos.find(
      (g) => hablanDeLoMismo(g.miembros[0], alimento) && mismosNumeros(g.miembros[0], alimento),
    );
    if (grupo) grupo.miembros.push(alimento);
    else grupos.push({ miembros: [alimento] });
  }

  return grupos.map(({ miembros }) => {
    const mejor = miembros.reduce((a, b) => {
      const diferencia = cuantosDatosTrae(b) - cuantosDatosTrae(a);
      if (diferencia !== 0) return diferencia > 0 ? b : a;
      // A igualdad de datos, el nombre más corto: es el más genérico y
      // el que menos se parece al envase de una marca concreta.
      return b.nombre.length < a.nombre.length ? b : a;
    });
    return { alimento: mejor, repetidos: miembros.length - 1 };
  });
}

/**
 * Deja el nombre en una línea.
 *
 * Los nombres de Open Food Facts los teclea gente, y vienen con saltos
 * de línea y códigos dentro: "LECHE SEMIDESNATADA PULEVA BRIK 1\n5053".
 * Sin limpiarlo, esa fila rompe la lista.
 */
export function limpiarNombre(nombre: string): string {
  return nombre.replace(/\s+/g, " ").trim();
}

/**
 * ¿El nombre del producto tiene algo que ver con lo que se buscó?
 *
 * Buscando "leche" salen "Crema" y "Alimento a base de almendras":
 * coinciden porque su MARCA es "Lonco leche", no porque sean leche. Se
 * exige que la coincidencia esté en el nombre del producto, que es lo
 * que se estaba buscando.
 *
 * No es un filtro de relevancia propio —eso sería opinar sobre qué te
 * interesa—: es comprobar que el resultado coincide donde importaba.
 */
export function coincideConLaBusqueda(nombre: string, consulta: string): boolean {
  const delNombre = new Set(palabras(nombre));
  const buscadas = palabras(consulta).filter((p) => p.length > 2 && !RELLENO.has(p));
  if (buscadas.length === 0) return true;
  return buscadas.some((p) => delNombre.has(p));
}
