"use client";

import { Suspense, useRef, useState } from "react";
import { MealComposer, type MealComposerHandle } from "@/components/register/MealComposer";
import { foodToDraftItem } from "@/lib/nutrition/food-to-item";
import { guardarAlimentoExterno } from "@/lib/actions/foods";
import {
  ETIQUETA_DE_MOTIVO,
  sufijoDeMarca,
  type ResultadoBusqueda,
} from "@/lib/nutrition/busqueda-alimentos";
import type { FoodRow } from "@/lib/supabase/types";
import { formatKcal } from "@/lib/format";
import { SearchIcon, PlusIcon } from "@/components/ui/icons";
import { useRegisterContext } from "@/lib/register-context";

export default function BuscarAlimentoPage() {
  // `useRegisterContext` lee la URL, y eso obliga a un límite de Suspense.
  return (
    <Suspense fallback={null}>
      <BuscarAlimentoInner />
    </Suspense>
  );
}

function BuscarAlimentoInner() {
  const { mealType, date } = useRegisterContext();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ResultadoBusqueda[]>([]);
  const [loading, setLoading] = useState(false);
  const [añadiendo, setAñadiendo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const composerRef = useRef<MealComposerHandle>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Teclear rápido lanzaba una búsqueda por letra y las respuestas
  // podían llegar desordenadas: la de "pol" después de la de "pollo",
  // pisando los resultados buenos con los de una consulta más vieja.
  const peticionRef = useRef(0);

  function handleQueryChange(value: string) {
    setQuery(value);
    setError(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      const miTurno = ++peticionRef.current;
      setLoading(true);
      try {
        const res = await fetch(`/api/foods/search?q=${encodeURIComponent(value)}`);
        const data = await res.json();
        if (miTurno !== peticionRef.current) return; // llegó tarde: se descarta
        setResults(data.results ?? []);
      } catch {
        if (miTurno === peticionRef.current) setError("No se ha podido buscar. Prueba otra vez.");
      } finally {
        if (miTurno === peticionRef.current) setLoading(false);
      }
    }, 350);
  }

  function añadirAlimento(food: FoodRow) {
    const cantidad = food.serving_size_g ?? food.serving_size_ml ?? 100;
    composerRef.current?.addItem(foodToDraftItem(food, cantidad));
  }

  async function elegir(resultado: ResultadoBusqueda) {
    if (resultado.origen === "local") {
      añadirAlimento(resultado.food);
      return;
    }
    // Uno de fuera se guarda primero en tu catálogo: a partir de ahora es
    // tuyo, sale instantáneo y funciona sin cobertura.
    setAñadiendo(resultado.clave);
    setError(null);
    try {
      const guardado = await guardarAlimentoExterno(resultado.externo);
      añadirAlimento(guardado as FoodRow);
    } catch {
      setError("No se ha podido guardar ese alimento. Inténtalo otra vez.");
    } finally {
      setAñadiendo(null);
    }
  }

  const buscandoFuera = query.trim().length >= 3;

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <SearchIcon size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" />
        <input
          autoFocus
          value={query}
          onChange={(e) => handleQueryChange(e.target.value)}
          placeholder="Buscar alimento…"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface)] py-2.5 pl-9 pr-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
        />
      </div>

      {loading ? (
        <p className="text-xs text-[var(--text-secondary)]">
          {buscandoFuera ? "Buscando en tu catálogo y en Open Food Facts…" : "Buscando…"}
        </p>
      ) : null}
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}

      {!loading && query.trim().length >= 2 && results.length === 0 ? (
        <p className="text-xs text-[var(--text-secondary)]">
          Nada con ese nombre. Prueba con menos palabras — o añádelo a mano abajo con los datos de
          la etiqueta.
        </p>
      ) : null}

      {results.length > 0 ? (
        <ul className="surface-raised flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
          {results.map((resultado) => (
            <li key={resultado.clave}>
              <button
                type="button"
                onClick={() => elegir(resultado)}
                disabled={añadiendo !== null}
                className="tap-row flex w-full items-center justify-between gap-3 px-4 py-3 text-left disabled:opacity-60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {resultado.nombre}
                    {sufijoDeMarca(resultado.marca, resultado.repetidos)}
                  </p>
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {ETIQUETA_DE_MOTIVO[resultado.motivo]} · {formatKcal(resultado.energyKcal)}/100
                    {resultado.basis === "per_100ml" ? "ml" : "g"}
                  </p>
                </div>
                <span className="btn-primary flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--accent-fg)]">
                  {añadiendo === resultado.clave ? "…" : <PlusIcon size={14} />}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      <MealComposer
        initialMealType={mealType}
        date={date}
        ref={composerRef}
        initialItems={[]}
        title="Añadir a la comida"
        emptyLabel="Busca y toca un alimento para añadirlo."
      />
    </div>
  );
}
