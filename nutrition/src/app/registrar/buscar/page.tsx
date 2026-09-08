"use client";

import { useRef, useState } from "react";
import { MealComposer, type MealComposerHandle } from "@/components/register/MealComposer";
import { foodToDraftItem } from "@/lib/nutrition/food-to-item";
import type { FoodRow } from "@/lib/supabase/types";
import { formatKcal } from "@/lib/format";

interface SearchResult extends FoodRow {
  rankReason: "recent" | "favorite" | "custom" | "catalog";
}

const RANK_LABEL: Record<SearchResult["rankReason"], string> = {
  recent: "Reciente",
  favorite: "Favorito",
  custom: "Tuyo",
  catalog: "Catálogo",
};

export default function BuscarAlimentoPage() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const composerRef = useRef<MealComposerHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        setResults(data.results ?? []);
      } finally {
        setLoading(false);
      }
    }, 250);
  }

  function addFood(food: SearchResult) {
    const defaultQty = food.serving_size_g ?? food.serving_size_ml ?? 100;
    composerRef.current?.addItem(foodToDraftItem(food, defaultQty));
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        autoFocus
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Buscar alimento…"
        className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />

      {loading ? <p className="text-xs text-[var(--text-secondary)]">Buscando…</p> : null}

      {results.length > 0 ? (
        <ul className="glass-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden rounded-2xl">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => addFood(food)}
                className="tap-row flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div>
                  <p className="text-sm font-medium text-[var(--text-primary)]">
                    {food.name}
                    {food.brand ? ` · ${food.brand}` : ""}
                  </p>
                  <p className="text-xs text-[var(--text-secondary)]">
                    {RANK_LABEL[food.rankReason]} · {formatKcal(food.energy_kcal)}/100
                    {food.basis === "per_100ml" ? "ml" : "g"}
                  </p>
                </div>
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full btn-primary text-base leading-none">
                  +
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <MealComposer
        ref={composerRef}
        initialItems={[]}
        title="Añadir a la comida"
        emptyLabel="Busca y toca un alimento para añadirlo."
      />
    </div>
  );
}
