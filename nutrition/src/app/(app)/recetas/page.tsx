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
          className="rounded-lg btn-primary px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)]"
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
        <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
          {recipes.map((r) => (
            <li key={r.id}>
              <Link href={`/recetas/${r.id}`} className="tap-row flex items-center justify-between py-3">
                <span className="text-sm font-medium text-[var(--text-primary)]">{r.name}</span>
                <span className="flex items-center gap-2">
                  <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--text-secondary)]">
                    {r.servings} ración{r.servings === 1 ? "" : "es"}
                  </span>
                  <ChevronIcon />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function ChevronIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" className="text-[var(--text-tertiary)]">
      <path d="M9 5l7 7-7 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
