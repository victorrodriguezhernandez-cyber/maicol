"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { MealComposer } from "@/components/register/MealComposer";

type MealType = "breakfast" | "lunch" | "dinner" | "snack" | "other";
const VALID_TYPES: MealType[] = ["breakfast", "lunch", "dinner", "snack", "other"];

function ManualEntryForm() {
  // Tapping "+" on a meal-type group in Hoy/Diario links here with
  // ?type=breakfast so the composer opens already set to that type
  // instead of falling back to the time-of-day guess.
  const typeParam = useSearchParams().get("type");
  const initialMealType = VALID_TYPES.includes(typeParam as MealType) ? (typeParam as MealType) : undefined;

  return (
    <MealComposer
      initialItems={[]}
      title="Introducir manualmente"
      emptyLabel="Introduce gramos, kcal y macros del alimento."
      startWithAddForm
      initialMealType={initialMealType}
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
