import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { formatKcal } from "@/lib/format";
import { EmptyState } from "@/components/ui/EmptyState";
import { DeleteFoodButton } from "@/components/settings/DeleteFoodButton";

export default async function BibliotecaAlimentosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: foods } = await supabase
    .from("foods")
    .select("*")
    .eq("user_id", user.id)
    .order("updated_at", { ascending: false })
    .limit(100);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Biblioteca de alimentos</h1>
      <p className="text-xs text-[var(--text-secondary)]">
        Tus alimentos y productos personalizados (creados manualmente o desde etiquetas fotografiadas).
      </p>

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
                <p className="font-numeric text-xs text-[var(--text-secondary)]">
                  {formatKcal(f.energy_kcal)} / {f.basis === "per_100ml" ? "100 ml" : "100 g"}
                </p>
              </div>
              <DeleteFoodButton id={f.id} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
