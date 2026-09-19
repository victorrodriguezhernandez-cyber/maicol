"use client";

import { useState, useTransition } from "react";
import { updateMealType } from "@/lib/actions/meals";
import { MEAL_TYPE_LABELS } from "@/lib/format";
import { MealTypeIcon } from "@/components/ui/MealTypeIcon";

type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";

/**
 * Mover una comida a otro momento del día.
 *
 * El tipo se adivina por la hora a la que registras, así que se equivoca
 * a menudo — cenas tarde y entra como cena, picas a las cinco y entra
 * como merienda. Hasta ahora no había forma de corregirlo desde la
 * pantalla: había que pedírselo al coach (una llamada a la IA para
 * cambiar una etiqueta) o borrar la comida y volver a dictarla entera.
 *
 * Se guarda al tocar, sin botón de confirmar: es un cambio de una sola
 * columna, reversible tocando otro, y pedir confirmación para eso sobra.
 * Si falla, el selector vuelve solo a donde estaba y lo dice — quedarse
 * enseñando "Desayuno" cuando el guardado no ha llegado sería peor que
 * el propio fallo.
 */
export function MealTypePicker({ mealId, current }: { mealId: string; current: MealType }) {
  const [tipo, setTipo] = useState<MealType>(current);
  const [error, setError] = useState<string | null>(null);
  const [guardando, guardar] = useTransition();

  function cambiar(nuevo: MealType) {
    if (nuevo === tipo || guardando) return;
    const anterior = tipo;
    setTipo(nuevo);
    setError(null);
    guardar(async () => {
      const resultado = await updateMealType({ mealId, mealType: nuevo });
      if (!resultado.ok) {
        setTipo(anterior);
        setError(resultado.motivo);
      }
    });
  }

  return (
    <div className="flex flex-col gap-2">
      <p className="text-section">Momento del día</p>
      <div className="flex flex-wrap gap-1.5">
        {(Object.keys(MEAL_TYPE_LABELS) as MealType[]).map((valor) => {
          const activo = valor === tipo;
          return (
            <button
              key={valor}
              type="button"
              onClick={() => cambiar(valor)}
              aria-pressed={activo}
              disabled={guardando}
              className="tap-scale flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60"
              style={{
                background: activo ? "var(--accent)" : "var(--surface-2)",
                color: activo ? "var(--accent-fg)" : "var(--text-secondary)",
              }}
            >
              {/* El icono se dibuja a 18px; en un chip de este tamaño
                  se ve mejor a 14, y el CSS gana al atributo del SVG. */}
              <MealTypeIcon type={valor} className="h-3.5 w-3.5" />
              {MEAL_TYPE_LABELS[valor]}
            </button>
          );
        })}
      </div>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
