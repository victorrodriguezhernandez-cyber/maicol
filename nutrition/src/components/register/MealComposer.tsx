"use client";

import {
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  useTransition,
  forwardRef,
} from "react";
import { useRouter } from "next/navigation";
import { createMeal, type CreateMealInput } from "@/lib/actions/meals";
import type { MealItemSource, PrecisionLevel } from "@/lib/nutrition/types";
import {
  formatKcal,
  formatGrams,
  formatDateHeader,
  mealInstantForDate,
  numeroATexto,
  parseNumeroEs,
  todayLocalDateString,
  MEAL_TYPE_LABELS,
} from "@/lib/format";
import { MacroInline } from "@/components/ui/MacroInline";
import { estimateQuality, estimateQualityColor } from "@/lib/nutrition/estimate-quality";
import { TrashIcon, PlusIcon } from "@/components/ui/icons";

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
  /** Preselects the meal type — set when the composer was opened from a
   * specific meal-type group's "+" (Hoy/Diario), instead of the default
   * time-of-day guess. */
  initialMealType?: "breakfast" | "lunch" | "dinner" | "snack" | "other";
  /**
   * Fecha (YYYY-MM-DD) a la que va la comida. Viene del "+" de un día
   * concreto del diario. Sin ella se registra en hoy, como siempre.
   *
   * Existe porque antes CUALQUIER captura se guardaba en el día de hoy
   * aunque hubieras entrado desde un día pasado, y eso convertía "añadir
   * la merienda que se me olvidó ayer" en un registro mal puesto.
   */
  date?: string | null;
}>(function MealComposer(
  {
    initialItems,
    title = "Revisar estimación",
    emptyLabel = "Añade al menos un alimento.",
    startWithAddForm = false,
    initialMealType,
    date,
  },
  ref,
) {
  const router = useRouter();
  const [items, setItems] = useState<DraftItem[]>(initialItems);
  useImperativeHandle(ref, () => ({
    addItem: (item) => setItems((prev) => [...prev, item]),
  }));
  const [mealType, setMealType] = useState(initialMealType ?? guessMealType());
  const esOtroDia = Boolean(date) && date !== todayLocalDateString();
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

  /**
   * Los valores con los que cada alimento ENTRÓ, para reescalar siempre
   * desde ahí y no desde la edición anterior.
   *
   * Encadenar factores (×0,3 para ir de 100 a 30, y luego ×10/3 para
   * volver) arrastra error de coma flotante en cada paso, así que
   * 100 → 30 → 100 no devolvía exactamente las calorías de partida. Con
   * una base fija sí, y además la cuenta no depende de que el valor
   * anterior fuera utilizable.
   */
  const basesRef = useRef(new Map<string, DraftItem>());

  function rescaleItem(key: string, newAmount: number) {
    setItems((prev) =>
      prev.map((it) => {
        if (it.key !== key) return it;

        const base = basesRef.current.get(key) ?? it;
        if (!basesRef.current.has(key)) basesRef.current.set(key, it);

        // Un alimento que llegó sin cantidad no tiene proporción con la
        // que escalar nada: se le pone la cantidad y se dejan los macros
        // como están, que es más honesto que inventarse un factor.
        if (base.quantityAmount <= 0) return { ...it, quantityAmount: newAmount };

        const factor = newAmount / base.quantityAmount;
        const escala = (v: number | null | undefined) => (v != null ? v * factor : v);
        return {
          ...it,
          quantityAmount: newAmount,
          gramsEquivalent: escala(base.gramsEquivalent),
          energyKcal: base.energyKcal * factor,
          proteinG: base.proteinG * factor,
          carbohydratesG: base.carbohydratesG * factor,
          fatG: base.fatG * factor,
          fiberG: escala(base.fiberG),
          rangeKcalMin: escala(base.rangeKcalMin),
          rangeKcalMax: escala(base.rangeKcalMax),
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
    // `Number("64,5")` es NaN, y con `|| 0` detrás eso se convertía en un
    // 0 silencioso: escribías 64,5 g de algo y entraba con cero.
    const gramos = parseNumeroEs(draftGrams) ?? 100;
    const numero = (texto: string) => parseNumeroEs(texto) ?? 0;
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        name: draftName.trim(),
        quantityAmount: gramos,
        quantityUnit: "g",
        gramsEquivalent: gramos,
        energyKcal: numero(draftKcal),
        proteinG: numero(draftProtein),
        carbohydratesG: numero(draftCarbs),
        fatG: numero(draftFat),
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
      occurredAt: mealInstantForDate(date),
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
        // Volver al día al que se ha registrado, no siempre a Hoy: si
        // estabas rellenando el martes pasado, querías ver el martes.
        router.push(esOtroDia ? `/diario/${date}` : "/");
      } catch (e) {
        if (typeof navigator !== "undefined" && !navigator.onLine) {
          const { queueMealOffline } = await import("@/lib/offline/sync");
          await queueMealOffline(crypto.randomUUID(), payload);
          router.push(esOtroDia ? `/diario/${date}` : "/");
          return;
        }
        setError(e instanceof Error ? e.message : "No se pudo guardar la comida.");
      }
    });
  }

  return (
    <div className="flex flex-col gap-5 pb-32">
      {/* Registrar en un día que no es hoy tiene que verse ANTES de
          guardar, no descubrirse después buscando dónde fue a parar. */}
      {esOtroDia ? (
        <p
          className="rounded-xl px-3 py-2 text-xs font-medium"
          style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
        >
          Se registrará en {formatDateHeader(new Date(`${date}T12:00:00`))}, no en hoy.
        </p>
      ) : null}

      <div className="flex items-center justify-between gap-3">
        <h1 className="text-hero-title text-xl text-[var(--text-primary)]">{title}</h1>
        <select
          value={mealType}
          onChange={(e) => setMealType(e.target.value as typeof mealType)}
          className="rounded-full border border-[var(--border)] bg-[var(--surface-2)] px-3 py-1.5 text-xs font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        >
          {Object.entries(MEAL_TYPE_LABELS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
      </div>

      {items.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">{emptyLabel}</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li key={item.key} className="surface-soft p-4">
              <div className="flex items-start justify-between gap-2">
                <input
                  value={item.name}
                  onChange={(e) => updateItem(item.key, { name: e.target.value })}
                  className="flex-1 border-0 border-b border-transparent bg-transparent text-[15px] font-semibold text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label="Eliminar"
                  className="tap-scale shrink-0 text-[var(--text-tertiary)]"
                >
                  <TrashIcon size={16} />
                </button>
              </div>

              <div className="mt-2.5 flex items-center gap-2">
                <QuantityInput
                  value={item.quantityAmount}
                  unidad={item.quantityUnit}
                  onCommit={(n) => rescaleItem(item.key, n)}
                />
                <span className="text-xs text-[var(--text-secondary)]">{item.quantityUnit}</span>
                <span className="text-metric ml-auto text-lg text-[var(--text-primary)]">
                  {formatKcal(item.energyKcal)}
                </span>
              </div>

              <div className="mt-2 flex items-center justify-between gap-2">
                <MacroInline protein={item.proteinG} carbs={item.carbohydratesG} fat={item.fatG} />
                <ConfidenceBadge item={item} />
              </div>

              {item.rangeKcalMin != null && item.rangeKcalMax != null ? (
                <p className="mt-1.5 text-[11px] text-[var(--text-tertiary)]">
                  Rango probable: {Math.round(item.rangeKcalMin)}–{Math.round(item.rangeKcalMax)} kcal
                </p>
              ) : null}
            </li>
          ))}
        </ul>
      )}

      {showAddForm ? (
        <div className="surface-soft p-4">
          <p className="text-section mb-3">Añadir ingrediente</p>
          <div className="grid grid-cols-2 gap-2">
            <input placeholder="Nombre" value={draftName} onChange={(e) => setDraftName(e.target.value)} className="col-span-2 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-2 text-sm text-[var(--text-primary)]" />
            <input placeholder="Gramos" type="text" inputMode="decimal" value={draftGrams} onChange={(e) => setDraftGrams(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-2 text-sm text-[var(--text-primary)]" />
            <input placeholder="Kcal" type="text" inputMode="decimal" value={draftKcal} onChange={(e) => setDraftKcal(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-2 text-sm text-[var(--text-primary)]" />
            <input placeholder="Proteína g" type="text" inputMode="decimal" value={draftProtein} onChange={(e) => setDraftProtein(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-2 text-sm text-[var(--text-primary)]" />
            <input placeholder="Carbohidratos g" type="text" inputMode="decimal" value={draftCarbs} onChange={(e) => setDraftCarbs(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-2 text-sm text-[var(--text-primary)]" />
            <input placeholder="Grasas g" type="text" inputMode="decimal" value={draftFat} onChange={(e) => setDraftFat(e.target.value)} className="rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2.5 py-2 text-sm text-[var(--text-primary)]" />
          </div>
          <button type="button" onClick={addManualItem} className="btn-primary mt-3 w-full rounded-lg py-2.5 text-xs font-semibold text-[var(--accent-fg)]">
            Añadir
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setShowAddForm(true)}
          className="tap-scale flex items-center justify-center gap-1.5 rounded-2xl border border-dashed border-[var(--border-strong)] py-3 text-sm font-semibold text-[var(--accent)]"
        >
          <PlusIcon size={15} /> Añadir ingrediente
        </button>
      )}

      <div className="surface-raised flex flex-col gap-3.5 p-4">
        <div className="flex items-baseline justify-between">
          <p className="text-section">Total de la comida</p>
          <p className="text-metric text-2xl text-[var(--text-primary)]">{formatKcal(totals.kcal)}</p>
        </div>
        <div className="flex gap-5">
          <TotalChip label="Proteína" value={totals.protein} color="var(--metric-protein)" />
          <TotalChip label="Carbos" value={totals.carbs} color="var(--metric-carbs)" />
          <TotalChip label="Grasas" value={totals.fat} color="var(--metric-fat)" />
        </div>
      </div>

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}

      <button
        type="button"
        disabled={items.length === 0 || isPending}
        onClick={handleSave}
        className="btn-primary fixed inset-x-4 bottom-[calc(env(safe-area-inset-bottom)+16px)] mx-auto max-w-lg rounded-2xl py-3.5 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar comida"}
      </button>
    </div>
  );
});

/**
 * La cantidad de un ingrediente.
 *
 * ── Por qué tiene estado propio ────────────────────────────────────────
 *
 * El campo era `value={item.quantityAmount}` con
 * `Number(e.target.value) || 0`, y eso hacía imposible el primer gesto
 * de cualquiera que quiera cambiar una cantidad: borrarla. Al quedarse
 * vacío llegaba un 0, y el 0 rompía dos cosas a la vez — multiplicaba
 * todos los macros por cero, y dejaba la cantidad en 0, con lo que el
 * reescalado (que dividía por ella) ya no volvía a entrar nunca. El
 * campo se quedaba clavado en 0 sin aceptar una sola tecla más.
 *
 * Así que el texto lo lleva este componente, no el alimento: mientras
 * escribes el campo puede estar vacío o a medias sin que se toque nada,
 * y el alimento sólo se reescala cuando hay un número válido. Al salir
 * del campo, si lo que hay no vale, vuelve el último bueno.
 *
 * `type="text"` + `inputMode="decimal"` y no `type="number"`: el teclado
 * es el mismo, pero `number` tira el valor entero cuando lleva una coma
 * — que es lo que da un teclado español.
 */
function QuantityInput({
  value,
  unidad,
  onCommit,
}: {
  value: number;
  unidad: string;
  onCommit: (n: number) => void;
}) {
  const [texto, setTexto] = useState(() => numeroATexto(value));
  // Lo último que este campo mandó hacia arriba. Sirve para distinguir
  // un cambio que viene de aquí (no hay que resincronizar, o pisaríamos
  // lo que se está tecleando) de uno que viene de fuera.
  const ultimoRef = useRef(value);

  useEffect(() => {
    if (value === ultimoRef.current) return;
    ultimoRef.current = value;
    setTexto(numeroATexto(value));
  }, [value]);

  function alEscribir(entrada: string) {
    setTexto(entrada);
    const numero = parseNumeroEs(entrada);
    // Vacío, "0", "-" o a medio escribir: se deja el campo como está y
    // no se toca el alimento. Una cantidad de 0 tampoco se guarda nunca
    // — `createMeal` exige que sea positiva —, así que dejarla entrar
    // sólo serviría para romper el guardado más tarde.
    if (numero == null || numero <= 0) return;
    ultimoRef.current = numero;
    onCommit(numero);
  }

  function alSalir() {
    const numero = parseNumeroEs(texto);
    if (numero == null || numero <= 0) setTexto(numeroATexto(ultimoRef.current));
  }

  return (
    <input
      type="text"
      inputMode="decimal"
      value={texto}
      onChange={(e) => alEscribir(e.target.value)}
      onBlur={alSalir}
      onFocus={(e) => e.currentTarget.select()}
      aria-label={`Cantidad en ${unidad}`}
      className="text-metric w-16 rounded-lg border border-[var(--border)] bg-[var(--app-bg)] px-2 py-1 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
    />
  );
}

function TotalChip({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
      </div>
      <p className="text-metric text-sm text-[var(--text-primary)]">{formatGrams(value)}</p>
    </div>
  );
}

function ConfidenceBadge({ item }: { item: DraftItem }) {
  const { label, tier } = estimateQuality(item.precisionLevel, item.confidence);
  return (
    <span
      className="rounded-full px-2 py-0.5 text-[11px] font-medium"
      style={{ color: estimateQualityColor(tier), backgroundColor: "var(--surface-2)" }}
    >
      {label}
    </span>
  );
}
