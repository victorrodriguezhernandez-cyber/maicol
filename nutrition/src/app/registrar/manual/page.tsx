"use client";

import { MealComposer } from "@/components/register/MealComposer";

export default function ManualEntryPage() {
  return (
    <MealComposer
      initialItems={[]}
      title="Introducir manualmente"
      emptyLabel="Introduce gramos, kcal y macros del alimento."
      startWithAddForm
    />
  );
}
