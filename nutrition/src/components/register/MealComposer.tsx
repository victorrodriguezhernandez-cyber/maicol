"use client";

import { useImperativeHandle, useMemo, useState, useTransition, forwardRef } from "react";
import { useRouter } from "next/navigation";
import { createMeal, type CreateMealInput } from "@/lib/actions/meals";
import type { MealItemSource, PrecisionLevel } from "@/lib/nutrition/types";
import { formatKcal, formatGrams, MEAL_TYPE_LABELS } from "@/lib/format";

export interface DraftItem {
  key: string;
  foodId?: string | null;
  recipeId?: string | null;
  name: string;
  quantityAmount: number;
  quantityUnit: string;
  gramsEquivalent?: number | null;
  energyKcal: number;
  proteinG: number;
  carbohydratesG: number;
  fatG: number;
  fiberG?: number | null;
  source: MealItemSource;
  precisionLevel: PrecisionLevel;
  confidence?: "high" | "medium" | "low" | null;
  rangeKcalMin?: number | null;
  rangeKcalMax?: number | null;
}

function guessMealType(): "breakfast" | "lunch" | "dinner" | "snack" | "other" {
  const hour = new Date().getHours();
  if (hour < 11) return "breakfast";
  if (hour < 16) return "lunch";
  if (hour < 20) return "snack";
  return "dinner";
}

export interface MealComposerHandle {
  addItem: (item: DraftItem) => void;
}

export const MealComposer = forwardRef<MealComposerHandle, {
  initialItems: DraftItem[];
  title?: string;
  emptyLabel?: string;
  startWithAddForm?: boolean;
}>(function MealComposer(
  {
    initialItems,
    title = "Revisar estimación",
    emptyLabel = "Añade al menos un alimento.",
    startWithAddForm = false,
  },
  ref,
) {
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  useImperativeHandle(ref, () => ({
    addItem: (item) => setItems((prev) => [...prev, item]),
  }));
  const [mealType, setMealType] = useState(guessMealType());
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const totals = useMemo(
    () =>
      items.reduce(
        (acc, item) => ({
          kcal: acc.kcal + item.energyKcal,
          protein: acc.protein + item.proteinG,
          carbs: acc.carbs + item.carbohydratesG,
          fat: acc.fat + item.fatG,
        }),
        { kcal: 0, protein: 0, carbs: 0, fat: 0 },
      ),
    [items],
  );

  function updateItem(key: string, patch: Partial<DraftItem>) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, ...patch } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function rescaleItem(key: string, newAmount: number) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key || it.quantityAmount <= 0) return it;
        const factor = newAmount / it.quantityAmount;
        return {
          ...it,
          quantityAmount: newAmount,
          gramsEquivalent: it.gramsEquivalent != null ? it.gramsEquivalent * factor : it.gramsEquivalent,
          energyKcal: it.energyKcal * factor,
          proteinG: it.proteinG * factor,
          carbohydratesG: it.carbohydratesG * factor,
          fatG: it.fatG * factor,
          fiberG: it.fiberG != null ? it.fiberG * factor : it.fiberG,
          rangeKcalMin: it.rangeKcalMin != null ? it.rangeKcalMin * factor : it.rangeKcalMin,
          rangeKcalMax: it.rangeKcalMax != null ? it.rangeKcalMax * factor : it.rangeKcalMax,
        };
      }),
    );
  }

  const [showAddForm, setShowAddForm] = useState(startWithAddForm);
  const [draftName, setDraftName] = useState("");
  const [draftGrams, setDraftGrams] = useState("100");
  const [draftKcal, setDraftKcal] = useState("");
  const [draftProtein, setDraftProtein] = useState("");
  const [draftCarbs, setDraftCarbs] = useState("");
  const [draftFat, setDraftFat] = useState("");

  function addManualItem() {
    if (!draftName.trim() || !draftKcal) return;
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: draftName.trim(),
        quantityAmount: Number(draftGrams) || 100,
        quantityUnit: "g",
        gramsEquivalent: Number(draftGrams) || 100,
        energyKcal: Number(draftKcal) || 0,
        proteinG: Number(draftProtein) || 0,
        carbohydratesG: Number(draftCarbs) || 0,
        fatG: Number(draftFat) || 0,
        source: "manual",
        precisionLevel: "exact",
      },
    ]);
    setDraftName("");
    setDraftGrams("100");
    setDraftKcal("");
    setDraftProtein("");
    setDraftCarbs("");
    setDraftFat("");
    setShowAddForm(false);
  }

  function handleSave() {
    if (items.length === 0) return;
    setError(null);
    const payload: CreateMealInput = {
      occurredAt: new Date().toISOString(),
      mealType,
      items: items.map((it) => ({
        foodId: it.foodId ?? null,
        recipeId: it.recipeId ?? null,
        name: it.name,
        quantityAmount: it.quantityAmount,
        quantityUnit: it.quantityUnit,
        gramsEquivalent: it.gramsEquivalent ?? null,
        energyKcal: it.energyKcal,
        proteinG: it.proteinG,
        carbohydratesG: it.carbohydratesG,
        fatG: it.fatG,
        fiberG: it.fiberG ?? null,
        micronutrients: {},
        precisionLevel: it.precisionLevel,
        source: it.source,
        confidence: it.confidence ?? null,
        rangeKcalMin: it.rangeKcalMin ?? null,
        rangeKcalMax: it.rangeKcalMax ?? null,
      })),
    };
    startTransition(async () => {
      try {
        await createMeal(payload);
        router.push("/");
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo guardar la comida.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-4 pb-28">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h1>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Tipo de comida</span>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as typeof mealType)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </label>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li
              key={item.key}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5"
            >
              <div className="flex items-start justify-between gap-2">
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.key, { name: e.target.value })}
                  className="flex-1 bg-transparent text-sm font-medium text-[var(--text-primary)] outline-none"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label="Eliminar"
                  className="text-xs text-[var(--danger)]"
                >
                  Eliminar
                </button>
              </div>

              <div className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  value={item.quantityAmount}
                  onChange={(e) => rescaleItem(item.key, Number(e.target.value) || 0)}
                  className="w-20 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text-primary)]"
                />
                <span className="text-sm text-[var(--text-secondary)]">{item.quantityUnit}</span>
                <span className="ml-auto text-sm font-medium text-[var(--text-primary)]">
                  {formatKcal(item.energyKcal)}
                </span>
              </div>

              <div className="mt-1 flex items-center justify-between text-xs text-[var(--text-secondary)]">
                <span>
                  P {formatGrams(item.proteinG)} · C {formatGrams(item.carbohydratesG)} · G{" "}
                  {formatGrams(item.fatG)}
                </span>
                <ConfidenceBadge item={item} />
              </div>

              {item.rangeKcalMin != null && item.rangeKcalMax != null ? (
                <p className="mt-1 text-[11px] text-[var(--text-secondary)]">
                  Rango probable: {Math.round(item.rangeKcalMin)}–{Math.round(item.rangeKcalMax)} kcal
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {showAddForm ? (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5">
          <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">Añadir ingrediente</p>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Nombre" value={draftName} onChange={(e) => setDraftName(e.target.value)} className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)]" />
            <input placeholder="Gramos" type="number" value={draftGrams} onChange={(e) => setDraftGrams(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)]" />
            <input placeholder="Kcal" type="number" value={draftKcal} onChange={(e) => setDraftKcal(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)]" />
            <input placeholder="Proteína g" type="number" value={draftProtein} onChange={(e) => setDraftProtein(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)]" />
            <input placeholder="Carbohidratos g" type="number" value={draftCarbs} onChange={(e) => setDraftCarbs(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)]" />
            <input placeholder="Grasas g" type="number" value={draftFat} onChange={(e) => setDraftFat(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1.5 text-sm text-[var(--text-primary)]" />
          </div>
          <button type="button" onClick={addManualItem} className="mt-2 w-full rounded-lg bg-[var(--accent)] py-2 text-xs font-medium text-[var(--accent-fg)]">
            Añadir
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="rounded-2xl border border-dashed border-[var(--border)] py-3 text-sm font-medium text-[var(--accent)]"
        >
          + Añadir ingrediente
        </button>
      )}

      <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-2)] p-3 text-sm text-[var(--text-primary)]">
        Total: <strong>{formatKcal(totals.kcal)}</strong> · P {formatGrams(totals.protein)} · C{" "}
        {formatGrams(totals.carbs)} · G {formatGrams(totals.fat)}
      </div>

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}

      <button
        type="button"
        disabled={items.length === 0 || isPending}
        onClick={handleSave}
        className="fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] mx-auto max-w-lg rounded-xl bg-[var(--accent)] py-3.5 text-sm font-semibold text-[var(--accent-fg)] shadow-lg disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar comida"}
      </button>
    </div>
  );
});

function ConfidenceBadge({ item }: { item: DraftItem }) {
  const label =
    item.precisionLevel === "exact"
      ? "Alta"
      : item.precisionLevel === "calculated"
        ? "Media"
        : item.precisionLevel === "estimated"
          ? item.confidence === "low"
            ? "Baja"
            : "Media/Baja"
          : "Desconocida";
  const color =
    item.precisionLevel === "exact"
      ? "var(--success)"
      : item.precisionLevel === "calculated"
        ? "var(--accent)"
        : "var(--warning)";
  return (
    <span className="font-medium" style={{ color }}>
      {label}
    </span>
  );
}
