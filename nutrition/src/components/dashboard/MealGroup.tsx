"use client";

import Link from "next/link";
import { useState } from "react";
import { formatKcal, MEAL_TYPE_LABELS } from "@/lib/format";
import { MealTypeIcon } from "@/components/ui/MealTypeIcon";
import { ChevronDownIcon, PlusIcon } from "@/components/ui/icons";

export interface MealGroupItem {
  key: string;
  name: string;
  kcal: number;
  mealId: string;
}

/**
 * One meal-type block in the day's timeline (Desayuno/Comida/Merienda/
 * Cena/Otros) — the visual unit is the TYPE, not each individual `meals`
 * row, per the redesign brief: several `meals` rows logged under the
 * same type on the same day (e.g. two separate breakfast entries)
 * collapse into one card with a combined total, not two near-identical
 * cards. Starts expanded when it has 3 or fewer items (the common case);
 * bigger lists start collapsed so the timeline doesn't get dominated by
 * one meal.
 */
export function MealGroup({
  type,
  totalKcal,
  items,
}: {
  type: string;
  totalKcal: number;
  items: MealGroupItem[];
}) {
  const [open, setOpen] = useState(items.length <= 3);

  return (
    <div className="overflow-hidden rounded-2xl border border-[var(--border-soft)] bg-[var(--surface)]">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="tap-scale flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
        >
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
            <MealTypeIcon type={type} />
          </span>
          <span className="flex-1">
            <span className="block text-[13.5px] font-semibold text-[var(--text-primary)]">
              {MEAL_TYPE_LABELS[type] ?? type}
            </span>
            <span className="text-metric block text-xs text-[var(--text-tertiary)]">
              {items.length} alimento{items.length === 1 ? "" : "s"}
            </span>
          </span>
          <span className="text-metric text-sm font-semibold text-[var(--text-primary)]">
            {formatKcal(totalKcal)}
          </span>
          <ChevronDownIcon
            size={16}
            className={`shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </button>
        <Link
          href={`/registrar/manual?type=${type}`}
          aria-label={`Añadir a ${MEAL_TYPE_LABELS[type] ?? type}`}
          className="tap-scale flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-[var(--border)] text-[var(--text-secondary)]"
        >
          <PlusIcon size={15} />
        </Link>
      </div>

      {open ? (
        <ul className="flex flex-col border-t border-[var(--border-soft)] px-3.5">
          {items.map((item) => (
            <FoodRow key={item.key} item={item} />
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function FoodRow({ item }: { item: MealGroupItem }) {
  return (
    <li className="border-b border-[var(--border-soft)] last:border-b-0">
      <Link
        href={`/diario/comida/${item.mealId}`}
        className="tap-row flex items-center justify-between gap-3 py-2.5 pl-[52px] text-sm"
      >
        <span className="truncate text-[var(--text-secondary)]">{item.name}</span>
        <span className="text-metric shrink-0 text-xs text-[var(--text-tertiary)]">{formatKcal(item.kcal)}</span>
      </Link>
    </li>
  );
}
