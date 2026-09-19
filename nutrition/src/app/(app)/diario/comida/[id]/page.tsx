import { redirect, notFound } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { formatKcal, formatTime, MEAL_TYPE_LABELS } from "@/lib/format";
import { tituloDeComida } from "@/lib/nutrition/meal-title";
import { MealTypeIcon } from "@/components/ui/MealTypeIcon";
import { MealItemRow } from "@/components/dashboard/MealItemRow";
import { MealTypePicker } from "@/components/dashboard/MealTypePicker";
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

  // Ordenados por `position`, que es el orden en el que se guardaron.
  // Sin esto Postgres los devuelve en el orden que le conviene, y como el
  // título de la comida sale de los dos primeros ingredientes, la misma
  // comida podía llamarse "Leche con Cereales" o "Cereales con Leche"
  // según la recarga.
  const { data: meal, error } = await supabase
    .from("meals")
    .select("*, meal_items(*)")
    .eq("id", id)
    .order("position", { referencedTable: "meal_items", ascending: true })
    .single();
  if (error || !meal) notFound();

  const items = meal.meal_items as Array<Record<string, unknown>>;
  const totalKcal = items.reduce((a, b) => a + (b.energy_kcal as number), 0);

  // El encabezado dice de qué comida se trata ("Leche entera con Cereales")
  // y el momento del día pasa a ser una etiqueta debajo, que es lo que es.
  // Antes el título era "Comida" a secas: el mismo texto para las tres
  // comidas del día, sin decir cuál de ellas estabas mirando.
  const titulo = tituloDeComida(
    meal.name as string | null,
    items.map((i) => i.name as string),
  );

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
            <MealTypeIcon type={meal.meal_type as string} />
          </span>
          <div className="min-w-0">
            <h1 className="text-hero-title text-lg text-[var(--text-primary)]">
              {titulo ?? MEAL_TYPE_LABELS[meal.meal_type as string]}
            </h1>
            <p className="text-xs text-[var(--text-tertiary)]">
              {MEAL_TYPE_LABELS[meal.meal_type as string]} · {formatTime(meal.occurred_at)}
            </p>
          </div>
        </div>
        <DeleteMealButton mealId={meal.id} />
      </div>

      <div className="surface-raised flex items-baseline justify-between p-4">
        <p className="text-section">Total</p>
        <p className="text-metric text-xl text-[var(--text-primary)]">{formatKcal(totalKcal)}</p>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => (
          <MealItemRow key={item.id as string} item={item as never} />
        ))}
      </ul>

      <MealTypePicker mealId={meal.id} current={meal.meal_type} />
    </div>
  );
}
