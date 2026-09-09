"use client";

import { useEffect, useRef, useState } from "react";
import { MealComposer, type MealComposerHandle } from "@/components/register/MealComposer";
import { foodToDraftItem } from "@/lib/nutrition/food-to-item";
import type { FoodRow } from "@/lib/supabase/types";
import { formatKcal } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { PlusIcon, StarIcon } from "@/components/ui/icons";

interface Result extends FoodRow {
  rankReason: "recent" | "favorite" | "custom" | "catalog";
  timesUsed?: number;
}

export default function FavoritosPage() {
  const [results, setResults] = useState<Result[]>([]);
  const [loading, setLoading] = useState(true);
  const composerRef = useRef<MealComposerHandle>(null);

  useEffect(() => {
    fetch("/api/foods/search?q=")
      .then((r) => r.json())
      .then((data) => setResults(data.results ?? []))
      .finally(() => setLoading(false));
  }, []);

  function addFood(food: Result) {
    const defaultQty = food.serving_size_g ?? food.serving_size_ml ?? 100;
    composerRef.current?.addItem(foodToDraftItem(food, defaultQty));
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-hero-title text-xl text-[var(--text-primary)]">Favoritos y recientes</h1>

      {loading ? (
        <p className="text-xs text-[var(--text-secondary)]">Cargando…</p>
      ) : results.length === 0 ? (
        <EmptyState
          title="Todavía no tienes alimentos frecuentes"
          description="A medida que registres comidas, aparecerán aquí para acceder más rápido."
        />
      ) : (
        <ul className="surface-raised flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => addFood(food)}
                className="tap-row flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-2">
                  {food.rankReason === "favorite" ? (
                    <StarIcon size={13} className="shrink-0 text-[var(--warning)]" />
                  ) : null}
                  <div>
                    <p className="text-sm font-medium text-[var(--text-primary)]">{food.name}</p>
                    <p className="text-xs text-[var(--text-tertiary)]">
                      {formatKcal(food.energy_kcal)}/100{food.basis === "per_100ml" ? "ml" : "g"}
                    </p>
                  </div>
                </div>
                <span className="btn-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--accent-fg)]">
                  <PlusIcon size={14} />
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      <MealComposer
        ref={composerRef}
        initialItems={[]}
        title="Añadir a la comida"
        emptyLabel="Toca un alimento para añadirlo."
      />
    </div>
  );
}
