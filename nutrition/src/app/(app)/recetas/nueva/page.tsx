"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { createRecipe } from "@/lib/actions/recipes";
import type { FoodRow } from "@/lib/supabase/types";
import { formatKcal } from "@/lib/format";

interface DraftIngredient {
  key: string;
  foodId: string;
  name: string;
  gramsEquivalent: number;
}

export default function NuevaRecetaPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [servings, setServings] = useState("1");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<FoodRow[]>([]);
  const [ingredients, setIngredients] = useState<DraftIngredient[]>([]);
  const [saving, setSaving] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleQueryChange(value: string) {
    setQuery(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const res = await fetch(`/api/foods/search?q=${encodeURIComponent(value)}`);
      const data = await res.json();
      setResults(data.results ?? []);
    }, 250);
  }

  function addIngredient(food: FoodRow) {
    setIngredients((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        foodId: food.id,
        name: food.name,
        gramsEquivalent: food.serving_size_g ?? 100,
      },
    ]);
    setQuery("");
    setResults([]);
  }

  function updateGrams(key: string, grams: number) {
    setIngredients((prev) => prev.map((i) => (i.key === key ? { ...i, gramsEquivalent: grams } : i)));
  }

  function removeIngredient(key: string) {
    setIngredients((prev) => prev.filter((i) => i.key !== key));
  }

  async function handleSave() {
    if (!name.trim() || ingredients.length === 0) return;
    setSaving(true);
    try {
      const id = await createRecipe({
        name: name.trim(),
        servings: Number(servings) || 1,
        items: ingredients.map((i) => ({
          foodId: i.foodId,
          quantityAmount: i.gramsEquivalent,
          quantityUnit: "g",
          gramsEquivalent: i.gramsEquivalent,
        })),
      });
      router.push(`/recetas/${id}`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4 pb-24">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Nueva receta</h1>

      <div className="grid grid-cols-3 gap-2">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la receta"
          className="col-span-2 rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
        <input
          type="number"
          value={servings}
          onChange={(e) => setServings(e.target.value)}
          placeholder="Raciones"
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </div>

      <input
        value={query}
        onChange={(e) => handleQueryChange(e.target.value)}
        placeholder="Buscar ingrediente…"
        className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
      />
      {results.length > 0 ? (
        <ul className="glass-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden rounded-2xl">
          {results.map((food) => (
            <li key={food.id}>
              <button
                type="button"
                onClick={() => addIngredient(food)}
                className="tap-row flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-[var(--text-primary)]"
              >
                <span>{food.name}</span>
                <span className="font-numeric text-xs text-[var(--text-secondary)]">
                  {formatKcal(food.energy_kcal)}/100g
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {ingredients.length > 0 ? (
        <ul className="flex flex-col gap-2">
          {ingredients.map((ing) => (
            <li key={ing.key} className="glass-panel flex items-center gap-2 rounded-xl px-3 py-2.5">
              <span className="flex-1 text-sm text-[var(--text-primary)]">{ing.name}</span>
              <input
                type="number"
                value={ing.gramsEquivalent}
                onChange={(e) => updateGrams(ing.key, Number(e.target.value) || 0)}
                className="w-16 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text-primary)]"
              />
              <span className="text-xs text-[var(--text-secondary)]">g</span>
              <button
                type="button"
                onClick={() => removeIngredient(ing.key)}
                className="text-xs font-medium text-[var(--danger)] active:opacity-60"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-[var(--text-secondary)]">
          Busca y añade los ingredientes de tu receta.
        </p>
      )}

      <button
        type="button"
        disabled={saving || !name.trim() || ingredients.length === 0}
        onClick={handleSave}
        className="mt-2 w-full rounded-xl btn-primary py-3 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        {saving ? "Guardando…" : "Guardar receta"}
      </button>
    </div>
  );
}
