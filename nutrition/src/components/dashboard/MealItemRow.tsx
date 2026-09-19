"use client";

import { useTransition } from "react";
import { deleteMealItem } from "@/lib/actions/meals";
import { formatKcal } from "@/lib/format";
import { MacroInline } from "@/components/ui/MacroInline";
import { estimateQuality, estimateQualityColor } from "@/lib/nutrition/estimate-quality";
import { TrashIcon } from "@/components/ui/icons";
import type { MealItemRow as MealItemRowType } from "@/lib/supabase/types";

export function MealItemRow({ item }: { item: MealItemRowType }) {
  const [isPending, startTransition] = useTransition();
  const { label, tier } = estimateQuality(item.precision_level, item.confidence);

  return (
    <li className="surface-soft p-3.5">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="text-[14px] font-semibold text-[var(--text-primary)]">{item.name}</p>
          <p className="text-metric text-xs text-[var(--text-tertiary)]">
            {item.quantity_amount} {item.quantity_unit}
          </p>
        </div>
        <button
          type="button"
          disabled={isPending}
          onClick={() => startTransition(() => deleteMealItem(item.id))}
          aria-label="Eliminar"
          className="tap-scale shrink-0 text-[var(--text-tertiary)]"
        >
          <TrashIcon size={16} />
        </button>
      </div>
      <div className="mt-2.5 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="text-metric text-sm text-[var(--text-primary)]">{formatKcal(item.energy_kcal)}</span>
          <MacroInline protein={item.protein_g} carbs={item.carbohydrates_g} fat={item.fat_g} />
        </div>
        <span
          className="rounded-full bg-[var(--surface-2)] px-2 py-0.5 text-[10.5px] font-semibold"
          style={{ color: estimateQualityColor(tier) }}
        >
          {label}
        </span>
      </div>
    </li>
  );
}
