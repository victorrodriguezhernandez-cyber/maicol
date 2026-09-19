"use client";

import { useState } from "react";
import { formatGrams } from "@/lib/format";
import { NUTRIENTES_EXTRA } from "@/lib/nutrition/nutrientes-externos";
import { ChevronDownIcon } from "@/components/ui/icons";

export interface NutrientesDelAlimento {
  sugarsG?: number | null;
  saturatedFatG?: number | null;
  fiberG?: number | null;
  sodiumMg?: number | null;
  saltG?: number | null;
  micronutrients?: Record<string, number> | null;
}

/** Los cinco que ya tienen columna propia, en el orden de una etiqueta. */
const CON_COLUMNA = [
  { campo: "saturatedFatG", etiqueta: "de las cuales saturadas", unidad: "g" },
  { campo: "sugarsG", etiqueta: "de los cuales azúcares", unidad: "g" },
  { campo: "fiberG", etiqueta: "Fibra", unidad: "g" },
  { campo: "saltG", etiqueta: "Sal", unidad: "g" },
  { campo: "sodiumMg", etiqueta: "Sodio", unidad: "mg" },
] as const;

function formatear(valor: number, unidad: string): string {
  // Un decimal para los gramos, entero para los miligramos: 0,4 g de sal
  // dice algo, "0 g" no; y 47,3 mg de sodio finge una precisión que la
  // etiqueta no tiene.
  if (unidad === "mg") return `${Math.round(valor).toLocaleString("es-ES")} mg`;
  if (unidad === "µg") return `${valor.toLocaleString("es-ES", { maximumFractionDigits: 1 })} µg`;
  return formatGrams(valor, 1);
}

/**
 * El panel de nutrientes que enseñan las apps grandes.
 *
 * ── Por qué está plegado ───────────────────────────────────────────────
 *
 * Los cuatro macros son los que miras todos los días; el resto lo miras
 * cuando te hace falta. Enseñarlo todo abierto convierte cada línea del
 * diario en una etiqueta de bote y esconde lo que importa.
 *
 * ── Por qué sólo aparece lo que hay ────────────────────────────────────
 *
 * Un nutriente que la fuente no declaró NO sale como "0 g". Decir cero
 * es afirmar que el alimento no lo tiene, y eso no es lo mismo que no
 * saberlo (regla 1). Si no viene, no está la fila; y si no viene
 * ninguno, el panel entero no se dibuja en vez de dejar una lista de
 * ceros que parecería un dato.
 */
export function NutrientPanel({
  nutrientes,
  className = "",
}: {
  nutrientes: NutrientesDelAlimento;
  className?: string;
}) {
  const [abierto, setAbierto] = useState(false);

  const filas: { etiqueta: string; texto: string }[] = [];
  for (const { campo, etiqueta, unidad } of CON_COLUMNA) {
    const valor = nutrientes[campo];
    if (valor != null) filas.push({ etiqueta, texto: formatear(valor, unidad) });
  }
  const extras = nutrientes.micronutrients ?? {};
  for (const { clave, etiqueta, unidad } of NUTRIENTES_EXTRA) {
    const valor = extras[clave];
    if (valor != null) filas.push({ etiqueta, texto: formatear(valor, unidad) });
  }

  if (filas.length === 0) return null;

  return (
    <div className={className}>
      <button
        type="button"
        onClick={() => setAbierto((a) => !a)}
        aria-expanded={abierto}
        className="tap-scale flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]"
      >
        {abierto ? "Ocultar" : `Ver ${filas.length} nutriente${filas.length === 1 ? "" : "s"} más`}
        <ChevronDownIcon
          size={12}
          className={`transition-transform duration-200 ${abierto ? "rotate-180" : ""}`}
        />
      </button>

      {abierto ? (
        <dl className="mt-2 flex flex-col gap-1">
          {filas.map((fila) => (
            <div
              key={fila.etiqueta}
              className="flex items-baseline justify-between gap-3 text-[11.5px]"
            >
              <dt className="text-[var(--text-tertiary)]">{fila.etiqueta}</dt>
              <dd className="text-metric text-[var(--text-secondary)]">{fila.texto}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
