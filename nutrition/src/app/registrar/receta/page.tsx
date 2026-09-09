"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { MealComposer, type DraftItem } from "@/components/register/MealComposer";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatKcal } from "@/lib/format";
import { ChevronRightIcon } from "@/components/ui/icons";

interface RecipeSummary {
  id: string;
  name: string;
  servings: number;
}

interface RecipeDetail {
  recipe: { id: string; name: string; servings: number };
  totals: { totalGrams: number; total: { energy_kcal: number; protein_g: number; carbohydrates_g: number; fat_g: number; fiber_g: number | null }; perServing: { energy_kcal: number; protein_g: number; carbohydrates_g: number; fat_g: number; fiber_g: number | null } };
}

export default function RegistrarRecetaPage() {
  return (
    <Suspense fallback={<p className="text-sm text-[var(--text-secondary)]">Cargando…</p>}>
      <RegistrarRecetaInner />
    </Suspense>
  );
}

function RegistrarRecetaInner() {
  const searchParams = useSearchParams();
  const recipeId = searchParams.get("recipeId");
  const [recipes, setRecipes] = useState<RecipeSummary[]>([]);
  const [detail, setDetail] = useState<RecipeDetail | null>(null);
  const [portionKind, setPortionKind] = useState<"full" | "servings" | "percentage" | "grams">("servings");
  const [portionValue, setPortionValue] = useState("1");
  const [items, setItems] = useState<DraftItem[]>([]);

  useEffect(() => {
    if (recipeId) {
      fetch(`/api/recipes/${recipeId}`)
        .then((r) => r.json())
        .then(setDetail);
    } else {
      fetch("/api/recipes")
        .then((r) => r.json())
        .then((data) => setRecipes(data.recipes ?? []));
    }
  }, [recipeId]);

  function applyPortion() {
    if (!detail) return;
    const { recipe, totals } = detail;
    const value = Number(portionValue) || 0;
    let grams = 0;
    let factor = 0;
    if (portionKind === "full") {
      grams = totals.totalGrams;
      factor = 1;
    } else if (portionKind === "servings") {
      factor = recipe.servings > 0 ? value / recipe.servings : 0;
      grams = totals.totalGrams * factor;
    } else if (portionKind === "percentage") {
      factor = value / 100;
      grams = totals.totalGrams * factor;
    } else {
      grams = value;
      factor = totals.totalGrams > 0 ? value / totals.totalGrams : 0;
    }

    setItems([
      {
        key: crypto.randomUUID(),
        recipeId: recipe.id,
        name: recipe.name,
        quantityAmount: Math.round(grams),
        quantityUnit: "g",
        gramsEquivalent: grams,
        energyKcal: totals.total.energy_kcal * factor,
        proteinG: totals.total.protein_g * factor,
        carbohydratesG: totals.total.carbohydrates_g * factor,
        fatG: totals.total.fat_g * factor,
        fiberG: totals.total.fiber_g != null ? totals.total.fiber_g * factor : null,
        source: "recipe",
        precisionLevel: "calculated",
      },
    ]);
  }

  if (!recipeId) {
    return (
      <div className="flex flex-col gap-3">
        <h1 className="text-hero-title text-xl text-[var(--text-primary)]">Elige una receta</h1>
        {recipes.length === 0 ? (
          <EmptyState title="No tienes recetas guardadas" description="Crea una desde la pestaña Recetas." />
        ) : (
          <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
            {recipes.map((r) => (
              <li key={r.id}>
                <a
                  href={`/registrar/receta?recipeId=${r.id}`}
                  className="tap-row flex items-center justify-between py-3 text-sm font-medium text-[var(--text-primary)]"
                >
                  {r.name}
                  <ChevronRightIcon size={16} className="text-[var(--text-tertiary)]" />
                </a>
              </li>
            ))}
          </ul>
        )}
      </div>
    );
  }

  if (!detail) return <p className="text-sm text-[var(--text-secondary)]">Cargando…</p>;

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-hero-title text-xl text-[var(--text-primary)]">{detail.recipe.name}</h1>
      <p className="text-xs text-[var(--text-secondary)]">
        Receta completa: {formatKcal(detail.totals.total.energy_kcal)} ({Math.round(detail.totals.totalGrams)} g)
      </p>

      <div className="grid grid-cols-2 gap-2">
        <select
          value={portionKind}
          onChange={(e) => setPortionKind(e.target.value as typeof portionKind)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="full">Receta completa</option>
          <option value="servings">Raciones</option>
          <option value="percentage">Porcentaje (%)</option>
          <option value="grams">Gramos</option>
        </select>
        <input
          type="number"
          value={portionValue}
          disabled={portionKind === "full"}
          onChange={(e) => setPortionValue(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-50"
        />
      </div>
      <button
        type="button"
        onClick={applyPortion}
        className="tap-scale rounded-xl border border-dashed border-[var(--border-strong)] py-2.5 text-sm font-semibold text-[var(--accent)]"
      >
        Calcular
      </button>

      <MealComposer
        key={items.map((i) => i.key).join(",")}
        initialItems={items}
        title="Añadir a la comida"
      />
    </div>
  );
}
