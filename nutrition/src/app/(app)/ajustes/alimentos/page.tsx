import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatKcal } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteFoodButton } from "@/components/settings/DeleteFoodButton";
import { PageShell } from "@/components/ui/PageShell";

export default async function BibliotecaAlimentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <PageShell eyebrow="Creados manualmente o desde etiquetas fotografiadas" title="Biblioteca de alimentos">
      {!foods?.length ? (
        <EmptyState title="Todavía no tienes alimentos personalizados" />
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
          {foods.map((f) => (
            <li key={f.id} className="flex items-center justify-between py-2.5">
              <div>
                <p className="text-sm font-medium text-[var(--text-primary)]">
                  {f.name} {f.brand ? `· ${f.brand}` : ""}
                </p>
                <p className="text-metric text-xs text-[var(--text-tertiary)]">
                  {formatKcal(f.energy_kcal)} / {f.basis === "per_100ml" ? "100 ml" : "100 g"}
                </p>
              </div>
              <DeleteFoodButton id={f.id} />
            </li>
          ))}
        </ul>
      )}
    </PageShell>
  );
}
