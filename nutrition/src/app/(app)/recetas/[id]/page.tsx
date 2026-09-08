import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getRecipeWithItems } from "@/lib/data/recipes";
import { formatKcal, formatGrams } from "@/lib/format";

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

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
        <p className="text-xs text-[var(--text-secondary)]">
          Total ({Math.round(totals.totalGrams)} g, {recipe.servings} ración
          {recipe.servings === 1 ? "" : "es"})
        </p>
        <p className="mt-1 text-lg font-semibold text-[var(--text-primary)]">
          {formatKcal(totals.total.energy_kcal)}
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          P {formatGrams(totals.total.protein_g)} · C {formatGrams(totals.total.carbohydrates_g)} · G{" "}
          {formatGrams(totals.total.fat_g)}
        </p>
        <p className="mt-2 text-xs font-medium text-[var(--text-secondary)]">Por ración</p>
        <p className="text-sm text-[var(--text-primary)]">{formatKcal(totals.perServing.energy_kcal)}</p>
      </div>

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)]">
        <p className="border-b border-[var(--border)] px-4 py-2.5 text-xs font-medium text-[var(--text-secondary)]">
          Ingredientes
        </p>
        <ul className="divide-y divide-[var(--border)]">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-[var(--text-primary)]">{item.foods.name}</span>
              <span className="text-[var(--text-secondary)]">{item.grams_equivalent} g</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
