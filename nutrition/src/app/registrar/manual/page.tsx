"use client";

import { Suspense } from "react";
import { MealComposer } from "@/components/register/MealComposer";
import { useRegisterContext } from "@/lib/register-context";

function ManualEntryForm() {
  // El "+" de una comida del diario trae ?type=breakfast&date=2026-09-14,
  // así que el compositor abre ya puesto en esa comida y ese día en vez
  // de adivinar por la hora y registrar en hoy.
  const { mealType, date } = useRegisterContext();

  return (
    <MealComposer
      initialItems={[]}
      title="Introducir manualmente"
      emptyLabel="Introduce gramos, kcal y macros del alimento."
      startWithAddForm
      initialMealType={mealType}
      date={date}
    />
  );
}

export default function ManualEntryPage() {
  return (
    <Suspense fallback={null}>
      <ManualEntryForm />
    </Suspense>
  );
}
