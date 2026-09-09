import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { getRecipeWithItems } from "@/lib/data/recipes";
import { formatKcal } from "@/lib/format";
import { MacroInline } from "@/components/ui/MacroInline";
import { PageShell } from "@/components/ui/PageShell";
import { SectionHeader } from "@/components/ui/SectionHeader";

export default async function RecetaDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  let data;
  try {
    data = await getRecipeWithItems(supabase, id);
  } catch {
    notFound();
  }
  const { recipe, items, totals } = data!;

  return (
    <PageShell
      title={recipe.name}
      trailing={
        <Link
          href={`/registrar/receta?recipeId=${recipe.id}`}
          className="btn-primary tap-scale rounded-full px-3.5 py-2 text-xs font-semibold text-[var(--accent-fg)]"
        >
          Registrar
        </Link>
      }
    >
      <div className="surface-soft flex flex-col gap-2.5 p-4">
        <p className="text-xs text-[var(--text-secondary)]">
          Total ({Math.round(totals.totalGrams)} g, {recipe.servings} ración
          {recipe.servings === 1 ? "" : "es"})
        </p>
        <p className="text-metric text-2xl text-[var(--text-primary)]">{formatKcal(totals.total.energy_kcal)}</p>
        <MacroInline protein={totals.total.protein_g} carbs={totals.total.carbohydrates_g} fat={totals.total.fat_g} />
        <div className="mt-1 flex items-baseline justify-between border-t border-[var(--border-soft)] pt-2.5">
          <p className="text-section">Por ración</p>
          <p className="text-metric text-sm text-[var(--text-primary)]">{formatKcal(totals.perServing.energy_kcal)}</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        <SectionHeader>Ingredientes</SectionHeader>
        <ul className="surface-soft divide-y divide-[var(--border-soft)] overflow-hidden">
          {items.map((item) => (
            <li key={item.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
              <span className="text-[var(--text-primary)]">{item.foods.name}</span>
              <span className="text-metric text-[var(--text-secondary)]">{item.grams_equivalent} g</span>
            </li>
          ))}
        </ul>
      </div>
    </PageShell>
  );
}
