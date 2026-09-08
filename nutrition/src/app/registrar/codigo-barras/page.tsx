"use client";

import { useEffect, useRef, useState } from "react";
import { BrowserMultiFormatReader } from "@zxing/browser";
import { MealComposer, type DraftItem } from "@/components/register/MealComposer";
import { formatKcal } from "@/lib/format";
import type { FoodRow } from "@/lib/supabase/types";

type ScanState =
  | { kind: "scanning" }
  | { kind: "looking_up"; code: string }
  | { kind: "found"; code: string; food: FoodRow }
  | { kind: "not_found"; code: string }
  | { kind: "unavailable"; reason: string }
  | { kind: "camera_error" };

export default function BarcodeScannerPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [state, setState] = useState<ScanState>({ kind: "scanning" });
  const [quantity, setQuantity] = useState("100");
  const [items, setItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    if (state.kind !== "scanning") return;
    const reader = new BrowserMultiFormatReader();
    const controlsPromise = reader.decodeFromVideoDevice(
      undefined,
      videoRef.current!,
      (result) => {
        if (result) {
          const code = result.getText();
          setState({ kind: "looking_up", code });
        }
      },
    );

    return () => {
      controlsPromise.then((controls) => controls.stop()).catch(() => {});
    };
  }, [state.kind]);

  useEffect(() => {
    if (state.kind !== "looking_up") return;
    fetch(`/api/barcode/${encodeURIComponent(state.code)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.status === "found") setState({ kind: "found", code: state.code, food: data.food });
        else if (data.status === "not_found") setState({ kind: "not_found", code: state.code });
        else setState({ kind: "unavailable", reason: data.reason ?? "unknown" });
      })
      .catch(() => setState({ kind: "unavailable", reason: "network_error" }));
  }, [state]);

  function addToMeal() {
    if (state.kind !== "found") return;
    const grams = Number(quantity) || 0;
    const factor = grams / 100;
    const food = state.food;
    setItems([
      {
        key: crypto.randomUUID(),
        foodId: food.id,
        name: food.brand ? `${food.name} (${food.brand})` : food.name,
        quantityAmount: grams,
        quantityUnit: food.basis === "per_100ml" ? "ml" : "g",
        gramsEquivalent: grams,
        energyKcal: food.energy_kcal * factor,
        proteinG: food.protein_g * factor,
        carbohydratesG: food.carbohydrates_g * factor,
        fatG: food.fat_g * factor,
        fiberG: food.fiber_g != null ? food.fiber_g * factor : null,
        source: food.source,
        precisionLevel: "exact",
      },
    ]);
  }

  if (items.length > 0) {
    return <MealComposer initialItems={items} title="Añadir a la comida" />;
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Escanear código de barras</h1>

      {state.kind === "scanning" ? (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)] bg-black">
          <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        </div>
      ) : null}

      {state.kind === "looking_up" ? (
        <p className="text-sm text-[var(--text-secondary)]">Buscando {state.code}…</p>
      ) : null}

      {state.kind === "not_found" ? (
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-sm text-[var(--text-primary)]">
            No encontramos el código {state.code} en Open Food Facts.
          </p>
          <a
            href="/registrar/etiqueta"
            className="mt-2 inline-block text-sm font-medium text-[var(--accent)]"
          >
            Fotografiar etiqueta en su lugar →
          </a>
        </div>
      ) : null}

      {state.kind === "unavailable" ? (
        <p className="text-sm text-[var(--danger)]">
          Open Food Facts no está disponible ahora mismo. Prueba de nuevo o introduce el
          alimento manualmente.
        </p>
      ) : null}

      {state.kind === "found" ? (
        <div className="glass-panel rounded-2xl p-4">
          <p className="text-sm font-medium text-[var(--text-primary)]">
            {state.food.name} {state.food.brand ? `· ${state.food.brand}` : ""}
          </p>
          <p className="text-xs text-[var(--text-secondary)]">
            {formatKcal(state.food.energy_kcal)} / 100{state.food.basis === "per_100ml" ? "ml" : "g"}
          </p>
          <label className="mt-3 flex items-center gap-2">
            <span className="text-xs text-[var(--text-secondary)]">Cantidad consumida</span>
            <input
              type="number"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              className="w-20 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text-primary)]"
            />
            <span className="text-xs text-[var(--text-secondary)]">
              {state.food.basis === "per_100ml" ? "ml" : "g"}
            </span>
          </label>
          <button
            type="button"
            onClick={addToMeal}
            className="mt-3 w-full rounded-xl btn-primary py-2.5 text-sm font-medium text-[var(--accent-fg)]"
          >
            Continuar
          </button>
        </div>
      ) : null}
    </div>
  );
}
