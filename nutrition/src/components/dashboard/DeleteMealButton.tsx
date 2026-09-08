"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMeal } from "@/lib/actions/meals";

export function DeleteMealButton({ mealId }: { mealId: string }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() =>
        startTransition(async () => {
          await deleteMeal(mealId);
          router.push("/diario");
        })
      }
      className="rounded-lg border border-[var(--danger)] px-3 py-1.5 text-xs font-medium text-[var(--danger)]"
    >
      Eliminar comida
    </button>
  );
}
