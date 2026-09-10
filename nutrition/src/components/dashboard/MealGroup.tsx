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
 * Cena) — the visual unit is the TYPE, not each individual `meals` row,
 * per the redesign brief: several logged entries of the same type on
 * the same day collapse into one block with a combined total. Always
 * renders, even with zero items, as a slim one-line row — the timeline
 * itself is the empty state (all four moments of the day visible at
 * once), not a big "nothing here" placeholder per meal.
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
  const [open, setOpen] = useState(items.length > 0 && items.length <= 4);
  const isEmpty = items.length === 0;

  return (
    <div className="overflow-hidden rounded-2xl bg-[var(--surface-2)]">
      <div className="flex items-center gap-3 px-3.5 py-3">
        <button
          type="button"
          onClick={() => items.length > 0 && setOpen((o) => !o)}
          className="tap-scale flex flex-1 items-center gap-3 text-left"
          aria-expanded={open}
          disabled={isEmpty}
        >
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
            style={{
              background: isEmpty ? "var(--surface)" : "var(--accent-soft)",
              color: isEmpty ? "var(--text-tertiary)" : "var(--accent)",
            }}
          >
            <MealTypeIcon type={type} />
          </span>
          <span className="flex-1">
            <span className="block text-[13px] font-semibold text-[var(--text-primary)]">
              {MEAL_TYPE_LABELS[type] ?? type}
            </span>
            <span className="text-metric block text-[11px] text-[var(--text-tertiary)]">
              {isEmpty ? "Sin registrar" : `${items.length} alimento${items.length === 1 ? "" : "s"}`}
            </span>
          </span>
          {!isEmpty ? (
            <>
              <span className="text-metric text-sm font-semibold text-[var(--text-primary)]">
                {formatKcal(totalKcal)}
              </span>
              <ChevronDownIcon
                size={15}
                className={`shrink-0 text-[var(--text-tertiary)] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
              />
            </>
          ) : null}
        </button>
        <Link
          href={`/registrar/manual?type=${type}`}
          aria-label={`Añadir a ${MEAL_TYPE_LABELS[type] ?? type}`}
          className="tap-scale flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--accent)]"
          style={{ background: "var(--accent-soft)" }}
        >
          <PlusIcon size={14} />
        </Link>
      </div>

      {open && !isEmpty ? (
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
        className="tap-row flex items-center justify-between gap-3 py-2.5 pl-[44px] text-sm"
      >
        <span className="truncate text-[var(--text-secondary)]">{item.name}</span>
        <span className="text-metric shrink-0 text-xs text-[var(--text-tertiary)]">{formatKcal(item.kcal)}</span>
      </Link>
    </li>
  );
}
