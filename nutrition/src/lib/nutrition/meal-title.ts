/**
 * Cómo se llama una comida que está guardada por ingredientes.
 *
 * ── Por qué el título se CALCULA y no se guarda ────────────────────────
 *
 * Una comida es su lista de ingredientes: eso es lo que hay en la base de
 * datos y lo único que se puede comprobar y corregir. Un título guardado
 * aparte sería un segundo sitio donde vive el nombre de la comida, y en
 * cuanto borres o cambies un ingrediente empezaría a mentir — "Leche con
 * cereales" en una comida donde ya sólo queda la leche. Calculándolo no
 * puede desincronizarse nunca.
 *
 * `meals.name` sigue mandando cuando existe, porque ahí va algo que
 * escribiste tú (una receta, un nombre que le pusiste); lo que no se hace
 * es inventarlo ni pedírselo a la IA (regla 11).
 *
 * Los nombres van tal cual. Pasarlos a minúsculas leería mejor en
 * castellano ("leche con cereales"), pero destrozaría las marcas —
 * "Kellogg's" no es "kellogg's" — y un dato del usuario no se retoca
 * para que quede bonito.
 */
export function tituloDeComida(
  name: string | null | undefined,
  nombresDeIngredientes: string[],
): string | null {
  const propio = name?.trim();
  if (propio) return propio;

  const nombres = nombresDeIngredientes.map((n) => n.trim()).filter(Boolean);
  if (nombres.length === 0) return null;
  if (nombres.length === 1) return nombres[0];
  if (nombres.length === 2) return `${nombres[0]} con ${nombres[1]}`;
  if (nombres.length === 3) return `${nombres[0]}, ${nombres[1]} y ${nombres[2]}`;

  // A partir de cuatro, la lista entera deja de ser un título y pasa a
  // ser la lista otra vez — que ya está justo debajo.
  const restantes = nombres.length - 2;
  return `${nombres[0]}, ${nombres[1]} y ${restantes} más`;
}
