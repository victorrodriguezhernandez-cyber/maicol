"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { deleteMeal } from "@/lib/actions/meals";
import { TrashIcon } from "@/components/ui/icons";

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
      className="btn-danger tap-scale flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-50"
    >
      <TrashIcon size={13} /> Eliminar
    </button>
  );
}
