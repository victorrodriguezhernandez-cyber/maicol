"use client";

import { useTransition } from "react";
import { deleteMealItem } from "@/lib/actions/meals";
import { formatKcal } from "@/lib/format";
import { MacroInline } from "@/components/ui/MacroInline";
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
    <li className="glass-panel rounded-2xl p-3.5">
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
          className="shrink-0 text-xs font-medium text-[var(--danger)] active:opacity-60"
        >
          Eliminar
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-numeric text-sm font-semibold text-[var(--text-primary)]">
            {formatKcal(item.energy_kcal)}
          </span>
          <MacroInline protein={item.protein_g} carbs={item.carbohydrates_g} fat={item.fat_g} />
        </div>
        <span className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
          {PRECISION_LABEL[item.precision_level]}
        </span>
      </div>
    </li>
  );
}
