import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { listRecipesWithSummary } from "@/lib/data/recipes";
import { formatKcal } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { BookIcon, PlusIcon } from "@/components/ui/icons";

export default async function RecetasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const recipes = await listRecipesWithSummary(supabase, user.id);

  return (
    <PageShell
      title="Recetas"
      trailing={
        <Link
          href="/recetas/nueva"
          className="btn-primary tap-scale flex items-center gap-1.5 rounded-full px-3.5 py-2 text-xs font-semibold text-[var(--accent-fg)]"
        >
          <PlusIcon size={14} /> Nueva
        </Link>
      }
    >
      {recipes.length === 0 ? (
        <EmptyState
          title="Todavía no tienes recetas"
          description="Crea tu primera receta a partir de alimentos de tu biblioteca."
        />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {recipes.map((r) => (
            <Link key={r.id} href={`/recetas/${r.id}`} className="tap-scale surface-soft flex flex-col gap-3 p-3.5">
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "var(--metric-carbs-soft)", color: "var(--metric-carbs)" }}
              >
                <BookIcon size={16} />
              </span>
              <div>
                <p className="line-clamp-2 text-[13.5px] font-semibold leading-snug text-[var(--text-primary)]">
                  {r.name}
                </p>
                <p className="text-metric mt-1 text-xs text-[var(--text-tertiary)]">
                  {r.perServingKcal > 0 ? `${formatKcal(r.perServingKcal)} / ración` : "Sin ingredientes"}
                </p>
              </div>
              <p className="text-[11px] text-[var(--text-tertiary)]">
                {r.servings} ración{r.servings === 1 ? "" : "es"} · {r.ingredientCount} ingrediente
                {r.ingredientCount === 1 ? "" : "s"}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PageShell>
  );
}
