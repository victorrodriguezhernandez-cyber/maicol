import { redirect, notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatKcal, formatTime, MEAL_TYPE_LABELS } from "@/lib/format";
import { MealItemRow } from "@/components/dashboard/MealItemRow";
import { DeleteMealButton } from "@/components/dashboard/DeleteMealButton";

export default async function MealDetailPage({
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

  const { data: meal, error } = await supabase
    .from("meals")
    .select("*, meal_items(*)")
    .eq("id", id)
    .single();
  if (error || !meal) notFound();

  const items = meal.meal_items as Array<Record<string, unknown>>;
  const totalKcal = items.reduce((a, b) => a + (b.energy_kcal as number), 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-[var(--text-primary)]">
            {MEAL_TYPE_LABELS[meal.meal_type as string]}
          </h1>
          <p className="text-xs text-[var(--text-secondary)]">{formatTime(meal.occurred_at)}</p>
        </div>
        <DeleteMealButton mealId={meal.id} />
      </div>

      <div className="flex items-baseline justify-between rounded-2xl bg-[var(--surface-2)] p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Total</p>
        <p className="font-numeric text-xl font-semibold text-[var(--text-primary)]">{formatKcal(totalKcal)}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <MealItemRow key={item.id as string} item={item as never} />
        ))}
      </ul>
    </div>
  );
}
