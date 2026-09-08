import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listRecipes } from "@/lib/data/recipes";
import { EmptyState } from "@/components/ui/EmptyState";

export default async function RecetasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const recipes = await listRecipes(supabase, user.id);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Recetas</h1>
        <Link
          href="/recetas/nueva"
          className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)]"
        >
          Nueva receta
        </Link>
      </div>

      {recipes.length === 0 ? (
        <EmptyState
          title="Todavía no tienes recetas"
          description="Crea tu primera receta a partir de alimentos de tu biblioteca."
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/recetas/${r.id}`}
                className="flex items-center justify-between rounded-2xl border border-[var(--border)] bg-[var(--surface)] px-4 py-3"
              >
                <span className="text-sm font-medium text-[var(--text-primary)]">{r.name}</span>
                <span className="text-xs text-[var(--text-secondary)]">
                  {r.servings} ración{r.servings === 1 ? "" : "es"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
