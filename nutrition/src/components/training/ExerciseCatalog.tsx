"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { SearchIcon, ChevronRightIcon } from "@/components/ui/icons";
import { Skeleton } from "@/components/ui/Skeleton";
import {
  MUSCLE_LABELS,
  MUSCLE_REGIONS,
  MUSCLE_REGION_ORDER,
  REGION_LABELS,
  type MuscleGroup,
  type MuscleRegion,
} from "@/lib/training/muscles";
import { EQUIPMENT_LABELS, type ExerciseRow } from "@/lib/training/types";

/**
 * El catálogo navegable.
 *
 * Arranca con la lista que ya trae el servidor — la pantalla llega llena,
 * sin un parpadeo de esqueletos — y sólo pide al API cuando el usuario
 * toca un filtro o escribe. `touched` es lo que distingue "todavía no ha
 * hecho nada" de "ha filtrado y no hay resultados".
 *
 * Los filtros son las seis zonas del cuerpo y no los 17 grupos, igual que
 * en `ExercisePicker` y por lo mismo: "hombro" es la pregunta, "hombro
 * lateral" es el detalle del ejercicio. Los dos sitios donde se eligen
 * ejercicios se navegan igual; que uno pidiera anatomía y el otro no
 * sería peor que cualquiera de las dos opciones.
 */
export function ExerciseCatalog({
  initialExercises,
  initialMuscle,
}: {
  initialExercises: ExerciseRow[];
  initialMuscle: MuscleGroup | null;
}) {
  const [query, setQuery] = useState("");
  // La zona es lo que se filtra. Si la pantalla llega con un músculo
  // concreto (se viene del mapa corporal), se abre en SU zona.
  const [region, setRegion] = useState<MuscleRegion | null>(
    initialMuscle ? MUSCLE_REGIONS[initialMuscle] : null,
  );
  const [commonOnly, setCommonOnly] = useState(false);
  const [mineOnly, setMineOnly] = useState(false);
  const [exercises, setExercises] = useState(initialExercises);
  const [loading, setLoading] = useState(false);
  const [failed, setFailed] = useState(false);
  const touched = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!touched.current) return;

    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (region) params.set("zona", region);
    if (mineOnly) params.set("mios", "1");
    if (commonOnly) params.set("comunes", "1");

    setLoading(true);
    const timer = setTimeout(() => {
      setFailed(false);
      fetch(`/api/exercises/search?${params}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("fallo"))))
        .then((data: { exercises: ExerciseRow[] }) => {
          setExercises(data.exercises);
          setLoading(false);
        })
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setFailed(true);
          setLoading(false);
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query, region, mineOnly, commonOnly]);

  function change<T>(setter: (v: T) => void) {
    return (value: T) => {
      touched.current = true;
      setter(value);
    };
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="relative">
        <SearchIcon
          size={17}
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
        />
        <input
          value={query}
          onChange={(e) => change(setQuery)(e.target.value)}
          placeholder="Buscar ejercicio…"
          aria-label="Buscar ejercicio"
          className="input-field pl-10"
        />
      </div>

      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 pb-1">
        <button
          type="button"
          onClick={() => change(setMineOnly)(!mineOnly)}
          data-active={mineOnly ? "true" : undefined}
          className="btn-pill shrink-0 px-3 py-1.5 text-xs"
        >
          Sólo los míos
        </button>
        <button
          type="button"
          onClick={() => change(setCommonOnly)(!commonOnly)}
          data-active={commonOnly ? "true" : undefined}
          className="btn-pill shrink-0 px-3 py-1.5 text-xs"
        >
          Más comunes
        </button>
        <button
          type="button"
          onClick={() => change(setRegion)(null)}
          data-active={region === null ? "true" : undefined}
          className="btn-pill shrink-0 px-3 py-1.5 text-xs"
        >
          Todos
        </button>
        {MUSCLE_REGION_ORDER.map((zona) => (
          <button
            key={zona}
            type="button"
            onClick={() => change(setRegion)(region === zona ? null : zona)}
            data-active={region === zona ? "true" : undefined}
            className="btn-pill shrink-0 px-3 py-1.5 text-xs"
          >
            {REGION_LABELS[zona]}
          </button>
        ))}
      </div>

      {failed ? (
        <p className="py-6 text-center text-sm text-[var(--danger)]">
          No se ha podido cargar el catálogo. Comprueba la conexión.
        </p>
      ) : loading ? (
        <div className="flex flex-col gap-2">
          {[0, 1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : exercises.length === 0 ? (
        <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
          <p className="text-sm text-[var(--text-secondary)]">
            Ningún ejercicio con esos filtros.
          </p>
          <Link href="/entreno/ejercicios/nuevo" className="btn-pill text-xs">
            Crear uno propio
          </Link>
        </div>
      ) : (
        <>
          <p className="text-xs text-[var(--text-tertiary)]">
            {exercises.length} ejercicio{exercises.length === 1 ? "" : "s"}
          </p>
          <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
            {exercises.map((ex) => (
              <Link
                key={ex.id}
                href={`/entreno/ejercicios/${ex.id}`}
                className="flex items-center justify-between gap-3 p-4"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {ex.name}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {MUSCLE_LABELS[ex.primary_muscle]} · {EQUIPMENT_LABELS[ex.equipment]} ·{" "}
                    {ex.mechanic === "compuesto" ? "Compuesto" : "Aislamiento"}
                    {ex.user_id ? " · tuyo" : ""}
                  </span>
                </div>
                <ChevronRightIcon size={16} className="shrink-0 text-[var(--text-tertiary)]" />
              </Link>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
