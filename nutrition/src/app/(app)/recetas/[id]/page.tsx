import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecipeWithItems } from "@/lib/data/recipes";
import { formatKcal } from "@/lib/format";
import { MacroInline } from "@/components/ui/MacroInline";

export default async function RecetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let data;
  try {
    data = await getRecipeWithItems(supabase, id);
  } catch {
    notFound();
  }
  const { recipe, items, totals } = data!;

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">{recipe.name}</h1>
        <Link
          href={`/registrar/receta?recipeId=${recipe.id}`}
          className="rounded-lg btn-primary px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)]"
        >
          Registrar
        </Link>
      </div>

      <div className="glass-panel flex flex-col gap-2.5 rounded-2xl p-4">
        <p className="text-xs text-[var(--text-secondary)]">
          Total ({Math.round(totals.totalGrams)} g, {recipe.servings} ración
          {recipe.servings === 1 ? "" : "es"})
        </p>
        <p className="font-numeric text-2xl font-semibold text-[var(--text-primary)]">
          {formatKcal(totals.total.energy_kcal)}
        </p>
        <MacroInline
          protein={totals.total.protein_g}
          carbs={totals.total.carbohydrates_g}
          fat={totals.total.fat_g}
        />
        <div className="mt-1 flex items-baseline justify-between border-t border-[var(--border-soft)] pt-2.5">
          <p className="text-[11px] font-medium text-[var(--text-tertiary)]">Por ración</p>
          <p className="font-numeric text-sm font-semibold text-[var(--text-primary)]">
            {formatKcal(totals.perServing.energy_kcal)}
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl">
        <p className="border-b border-[var(--border-soft)] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)]">
          Ingredientes
        </p>
        <ul className="divide-y divide-[var(--border-soft)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-[var(--text-primary)]">{item.foods.name}</span>
              <span className="font-numeric text-[var(--text-secondary)]">{item.grams_equivalent} g</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
