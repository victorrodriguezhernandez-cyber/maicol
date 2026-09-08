"use client";

import { useTransition } from "react";
import { deleteFood } from "@/lib/actions/food-library";

export function DeleteFoodButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteFood(id))}
      className="text-xs text-[var(--danger)]"
    >
      Eliminar
    </button>
  );
}
