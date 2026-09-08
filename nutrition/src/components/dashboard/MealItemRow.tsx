"use client";

import { useTransition } from "react";
import { deleteMealItem } from "@/lib/actions/meals";
import { formatKcal, formatGrams } from "@/lib/format";
import type { MealItemRow as MealItemRowType } from "@/lib/supabase/types";

const PRECISION_LABEL: Record<string, string> = {
  exact: "Alta",
  calculated: "Media",
  estimated: "Media/Baja",
  unknown: "Desconocida",
};

export function MealItemRow({ item }: { item: MealItemRowType }) {
  const [isPending, startTransition] = useTransition();

  return (
    <li className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-[var(--text-primary)]">{item.name}</p>
          <p className="text-xs text-[var(--text-secondary)]">
            {item.quantity_amount} {item.quantity_unit}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteMealItem(item.id))}
          className="text-xs text-[var(--danger)]"
        >
          Eliminar
        </button>
      </div>
      <div className="mt-1.5 flex items-center justify-between text-xs text-[var(--text-secondary)]">
        <span>
          {formatKcal(item.energy_kcal)} · P {formatGrams(item.protein_g)} · C{" "}
          {formatGrams(item.carbohydrates_g)} · G {formatGrams(item.fat_g)}
        </span>
        <span className="font-medium text-[var(--accent)]">
          {PRECISION_LABEL[item.precision_level]}
        </span>
      </div>
    </li>
  );
}
