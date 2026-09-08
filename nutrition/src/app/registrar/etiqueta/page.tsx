"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImageToBase64 } from "@/lib/image";
import { createCustomFood } from "@/lib/actions/foods";
import { MealComposer, type DraftItem } from "@/components/register/MealComposer";
import { formatKcal } from "@/lib/format";

interface LabelEstimate {
  name: string | null;
  brand: string | null;
  basis: "per_100g" | "per_100ml" | "per_serving";
  serving_size_g: number | null;
  serving_label: string | null;
  energy_kcal: number;
  protein_g: number;
  carbohydrates_g: number;
  sugars_g: number | null;
  fat_g: number;
  saturated_fat_g: number | null;
  fiber_g: number | null;
  sodium_mg: number | null;
  salt_g: number | null;
  legible: boolean;
}

type State =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "review"; estimate: LabelEstimate; photoUrl: string }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

export default function EtiquetaCapturaPage() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [quantity, setQuantity] = useState("100");
  const [items, setItems] = useState<DraftItem[]>([]);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    const { data, mimeType } = await compressImageToBase64(file);
    const photoUrl = URL.createObjectURL(file);
    setState({ kind: "analyzing" });
    const supabase = createClient();
    const { data: result, error } = await supabase.functions.invoke("analyze-label-photo", {
      body: { image: { data, mimeType } },
    });
    if (error) {
      // error.message here is supabase-js's own generic wrapper text ("Edge
      // Function returned a non-2xx status code"), not anything useful to
      // show someone — the specific case worth surfacing (no key configured)
      // already has its own branch below.
      setState({ kind: "error", message: "No se ha podido analizar la etiqueta. Inténtalo de nuevo en unos segundos." });
      return;
    }
    if (result?.error === "ai_unavailable") {
      setState({ kind: "unavailable" });
      return;
    }
    setState({ kind: "review", estimate: result as LabelEstimate, photoUrl });
  }

  async function confirmAndContinue() {
    if (state.kind !== "review") return;
    const e = state.estimate;
    const food = await createCustomFood({
      name: e.name ?? "Producto sin nombre",
      brand: e.brand,
      source: "nutrition_label",
      basis: e.basis,
      servingSizeG: e.serving_size_g,
      servingLabel: e.serving_label,
      energyKcal: e.energy_kcal,
      proteinG: e.protein_g,
      carbohydratesG: e.carbohydrates_g,
      sugarsG: e.sugars_g,
      fatG: e.fat_g,
      saturatedFatG: e.saturated_fat_g,
      fiberG: e.fiber_g,
      sodiumMg: e.sodium_mg,
      saltG: e.salt_g,
    });

    const grams = Number(quantity) || 100;
    const basisSize = e.basis === "per_serving" ? (e.serving_size_g ?? 100) : 100;
    const factor = grams / basisSize;
    setItems([
      {
        key: crypto.randomUUID(),
        foodId: food.id,
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        quantityAmount: grams,
        quantityUnit: e.basis === "per_100ml" ? "ml" : "g",
        gramsEquivalent: grams,
        energyKcal: e.energy_kcal * factor,
        proteinG: e.protein_g * factor,
        carbohydratesG: e.carbohydrates_g * factor,
        fatG: e.fat_g * factor,
        fiberG: e.fiber_g != null ? e.fiber_g * factor : null,
        source: "nutrition_label",
        precisionLevel: "exact",
      },
    ]);
  }

  if (items.length > 0) {
    return <MealComposer initialItems={items} title="Añadir a la comida" />;
  }

  if (state.kind === "review") {
    const e = state.estimate;
    return (
      <div className="flex flex-col gap-4">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Comprobar etiqueta</h1>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={state.photoUrl} alt="Etiqueta fotografiada" className="max-h-64 rounded-2xl object-contain" />

        {!e.legible ? (
          <p className="text-sm text-[var(--warning)]">
            La fotografía no parece legible. Comprueba los datos con cuidado o vuelve a fotografiar.
          </p>
        ) : null}

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-primary)]">
          <p className="font-medium">{e.name ?? "Sin nombre detectado"}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {e.brand ?? ""} · {e.basis === "per_100g" ? "por 100 g" : e.basis === "per_100ml" ? "por 100 ml" : `por ración (${e.serving_size_g ?? "?"} g)`}
          </p>
          <p className="mt-2">{formatKcal(e.energy_kcal)} · P {e.protein_g}g · C {e.carbohydrates_g}g · G {e.fat_g}g</p>
        </div>

        <label className="flex items-center gap-2">
          <span className="text-xs text-[var(--text-secondary)]">Cantidad consumida</span>
          <input
            type="number"
            value={quantity}
            onChange={(ev) => setQuantity(ev.target.value)}
            className="w-20 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text-primary)]"
          />
          <span className="text-xs text-[var(--text-secondary)]">
            {e.basis === "per_100ml" ? "ml" : "g"}
          </span>
        </label>

        <button
          type="button"
          onClick={confirmAndContinue}
          className="rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-[var(--accent-fg)]"
        >
          Guardar producto y continuar
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Fotografiar etiqueta</h1>
      <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
        <span className="text-3xl">🏷️</span>
        <span className="text-sm font-medium text-[var(--accent)]">Fotografiar tabla nutricional</span>
        <input
          type="file"
          accept="image/*"
          capture="environment"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />
      </label>

      {state.kind === "analyzing" ? (
        <p className="text-sm text-[var(--text-secondary)]">Analizando…</p>
      ) : null}
      {state.kind === "unavailable" ? (
        <p className="text-sm text-[var(--danger)]">
          La IA no está disponible ahora mismo. Puedes crear el alimento manualmente.
        </p>
      ) : null}
      {state.kind === "error" ? (
        <p className="text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}
    </div>
  );
}
