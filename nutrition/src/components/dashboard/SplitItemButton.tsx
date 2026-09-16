"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { splitMealItem } from "@/lib/actions/meals";
import { invokeAi, mensajeDeFallo } from "@/lib/ai/invoke";
import type { AiMealEstimateResponse } from "@/lib/nutrition/ai-estimate-to-item";
import type { MealItemRow } from "@/lib/supabase/types";
import { formatKcal } from "@/lib/format";
import { MacroInline } from "@/components/ui/MacroInline";
import { Sheet } from "@/components/ui/Sheet";
import { SplitIcon } from "@/components/ui/icons";

/**
 * "Desglosar": abre una línea del diario en sus ingredientes.
 *
 * ── Por qué hace falta ─────────────────────────────────────────────────
 *
 * Una comida que la IA estimó como un solo alimento ("Lomo con nata,
 * cuscús y hamburguesa — 980 kcal") no se puede revisar: no sabes si se
 * pasó con el aceite, y no puedes corregir sólo un ingrediente. Esto la
 * abre sin tener que borrarla y volver a dictarla.
 *
 * ── Y por qué es una estimación nueva, no un reparto ───────────────────
 *
 * En la fila guardada NO hay nada de cada ingrediente: sólo el nombre y
 * los totales. El desglose hay que volver a pedírselo a la IA, así que
 * los gramos de cada parte son una estimación nueva y la pantalla lo dice
 * enseñando el total que sale frente al que tenías. No se fuerza a que
 * cuadren: cuadrarlos a la fuerza sería inventar unos números que parecen
 * más exactos de lo que son.
 */
export function SplitItemButton({ item }: { item: MealItemRow }) {
  const [abierto, setAbierto] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [partes, setPartes] = useState<AiMealEstimateResponse["items"] | null>(null);
  const [guardando, guardar] = useTransition();

  async function pedirDesglose() {
    setAbierto(true);
    setError(null);
    setPartes(null);
    setCargando(true);

    // Se le dan los totales que el usuario ya aceptó para que el desglose
    // se parezca a ESA comida y no a una versión genérica del plato.
    const texto =
      `Desglosa este plato en sus ingredientes, uno por elemento: "${item.name}".\n` +
      `Cantidad registrada: ${item.quantity_amount} ${item.quantity_unit}.\n` +
      `El plato entero suma ${Math.round(item.energy_kcal)} kcal, ` +
      `${Math.round(item.protein_g)} g de proteína, ` +
      `${Math.round(item.carbohydrates_g)} g de carbohidratos y ` +
      `${Math.round(item.fat_g)} g de grasa. ` +
      `Ajusta las cantidades de cada ingrediente para acercarte a esos totales. ` +
      `Incluye el aceite de cocinar y las salsas si el plato los lleva.`;

    const { data, fallo } = await invokeAi<AiMealEstimateResponse>(
      createClient(),
      "analyze-text",
      { text: texto },
    );
    setCargando(false);

    if (fallo) {
      setError(mensajeDeFallo(fallo, "desglosar este plato"));
      return;
    }
    if (!data || data.items.length < 2) {
      setError(
        "La IA no ha sabido separarlo en ingredientes. Puedes borrar la línea y dictársela otra vez con más detalle.",
      );
      return;
    }
    setPartes(data.items);
  }

  function confirmar() {
    if (!partes) return;
    guardar(async () => {
      try {
        await splitMealItem({
          mealItemId: item.id,
          items: partes.map((p) => ({
            name: p.name,
            quantityAmount: p.estimated_quantity,
            quantityUnit: p.quantity_unit,
            energyKcal: p.energy_kcal,
            proteinG: p.protein_g,
            carbohydratesG: p.carbohydrates_g,
            fatG: p.fat_g,
            fiberG: p.fiber_g ?? null,
            micronutrients: {},
            source: "ai_text_estimation",
            precisionLevel: "estimated",
            confidence: p.confidence,
          })),
        });
        setAbierto(false);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido guardar el desglose.");
      }
    });
  }

  const totales = partes
    ? partes.reduce(
        (a, p) => ({
          kcal: a.kcal + p.energy_kcal,
          prot: a.prot + p.protein_g,
          carb: a.carb + p.carbohydrates_g,
          grasa: a.grasa + p.fat_g,
        }),
        { kcal: 0, prot: 0, carb: 0, grasa: 0 },
      )
    : null;
  const diferencia = totales ? Math.round(totales.kcal - item.energy_kcal) : 0;

  return (
    <>
      <button
        type="button"
        onClick={pedirDesglose}
        className="tap-scale flex items-center gap-1 text-[11px] font-semibold text-[var(--accent)]"
      >
        <SplitIcon size={13} /> Desglosar
      </button>

      <Sheet open={abierto} onOpenChange={setAbierto} title="Desglosar en ingredientes">
        <div className="flex flex-col gap-3 px-3 pb-3 pt-1">
          {cargando ? (
            <p className="text-sm text-[var(--text-secondary)]">Separando los ingredientes…</p>
          ) : null}

          {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

          {partes && totales ? (
            <>
              <ul className="flex flex-col divide-y divide-[var(--border-soft)]">
                {partes.map((p, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="min-w-0">
                      <p className="truncate text-[13.5px] text-[var(--text-primary)]">{p.name}</p>
                      <p className="text-metric text-[11px] text-[var(--text-tertiary)]">
                        {p.estimated_quantity} {p.quantity_unit}
                      </p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end">
                      <span className="text-metric text-[13px] text-[var(--text-primary)]">
                        {formatKcal(p.energy_kcal)}
                      </span>
                      <MacroInline protein={p.protein_g} carbs={p.carbohydrates_g} fat={p.fat_g} />
                    </div>
                  </li>
                ))}
              </ul>

              {/* El desglose es una estimación NUEVA, así que puede no dar
                  el mismo total. Decirlo es más honesto que cuadrarlo a la
                  fuerza y aparentar una exactitud que no hay. */}
              <p className="text-[11.5px] text-[var(--text-tertiary)]">
                Suma {formatKcal(totales.kcal)} frente a las {formatKcal(item.energy_kcal)} que
                tenías
                {diferencia === 0
                  ? ": coincide."
                  : ` (${diferencia > 0 ? "+" : ""}${diferencia} kcal). Es una estimación nueva, no un reparto de la anterior.`}
              </p>

              <button
                type="button"
                onClick={confirmar}
                disabled={guardando}
                className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
              >
                {guardando ? "Guardando…" : "Sustituir por estos ingredientes"}
              </button>
            </>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}
