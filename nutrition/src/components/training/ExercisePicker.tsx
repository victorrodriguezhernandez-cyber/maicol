"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchIcon, PlusIcon } from "@/components/ui/icons";
import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  MUSCLE_REGIONS,
  REGION_LABELS,
  type MuscleGroup,
} from "@/lib/training/muscles";
import { EQUIPMENT_LABELS, type ExerciseRow, type Equipment } from "@/lib/training/types";
import Link from "next/link";

/**
 * El selector de ejercicios.
 *
 * Filtra por músculo y por material porque son las dos preguntas reales
 * en el gimnasio: "qué hago de espalda" y "qué puedo hacer con lo que hay
 * libre". El texto libre está para cuando ya sabes el nombre.
 *
 * Cada tecleo cancela la petición anterior. Sin eso, escribir rápido deja
 * varias respuestas en vuelo y la lista acaba enseñando los resultados de
 * una búsqueda a medio escribir, que es el clásico "escribo 'press' y me
 * salen los de 'pre'".
 */
export function ExercisePicker({
  open,
  onOpenChange,
  onPick,
  initialMuscle,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (exerciseId: string, exercise: ExerciseRow) => void;
  initialMuscle?: MuscleGroup | null;
}) {
  const [query, setQuery] = useState("");
  const [muscle, setMuscle] = useState<MuscleGroup | null>(initialMuscle ?? null);
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [results, setResults] = useState<ExerciseRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (muscle) params.set("musculo", muscle);
    if (equipment) params.set("material", equipment);

    // Un respiro antes de pedir, para no lanzar una petición por letra.
    const timer = setTimeout(() => {
      setFailed(false);
      fetch(`/api/exercises/search?${params}`, { signal: controller.signal })
        .then((r) => (r.ok ? r.json() : Promise.reject(new Error("búsqueda fallida"))))
        .then((data: { exercises: ExerciseRow[] }) => setResults(data.exercises))
        .catch((e: unknown) => {
          if (e instanceof DOMException && e.name === "AbortError") return;
          setFailed(true);
          setResults([]);
        });
    }, 180);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [open, query, muscle, equipment]);

  if (!open) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Elegir ejercicio">
      <div className="flex flex-col gap-4">
        <div className="relative">
          <SearchIcon
            size={17}
            className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]"
          />
          <input
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar por nombre…"
            aria-label="Buscar ejercicio"
            className="input-field pl-10"
          />
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          <button
            type="button"
            onClick={() => setMuscle(null)}
            data-active={muscle === null ? "true" : undefined}
            className="btn-pill shrink-0 px-3 py-1.5 text-xs"
          >
            Todos
          </button>
          {MUSCLE_GROUPS.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMuscle(muscle === m ? null : m)}
              data-active={muscle === m ? "true" : undefined}
              className="btn-pill shrink-0 px-3 py-1.5 text-xs"
            >
              {MUSCLE_LABELS[m]}
            </button>
          ))}
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
            <button
              key={eq}
              type="button"
              onClick={() => setEquipment(equipment === eq ? null : eq)}
              data-active={equipment === eq ? "true" : undefined}
              className="btn-pill shrink-0 px-3 py-1.5 text-xs"
            >
              {EQUIPMENT_LABELS[eq]}
            </button>
          ))}
        </div>

        <div className="flex max-h-[45vh] flex-col overflow-y-auto">
          {results === null ? (
            <div className="flex flex-col gap-2 py-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : failed ? (
            <p className="py-6 text-center text-sm text-[var(--danger)]">
              No se ha podido cargar el catálogo. Comprueba la conexión.
            </p>
          ) : results.length === 0 ? (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <p className="text-sm text-[var(--text-secondary)]">
                Ningún ejercicio con esos filtros.
              </p>
              <Link
                href="/entreno/ejercicios/nuevo"
                onClick={() => onOpenChange(false)}
                className="btn-pill text-xs"
              >
                <PlusIcon size={13} /> Crear uno propio
              </Link>
            </div>
          ) : (
            results.map((ex) => (
              <button
                key={ex.id}
                type="button"
                onClick={() => onPick(ex.id, ex)}
                className="flex items-center justify-between gap-3 border-b border-[var(--border-soft)] px-1 py-3 text-left last:border-0"
              >
                <div className="flex min-w-0 flex-col gap-0.5">
                  <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                    {ex.name}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {REGION_LABELS[MUSCLE_REGIONS[ex.primary_muscle]]} ·{" "}
                    {MUSCLE_LABELS[ex.primary_muscle]} · {EQUIPMENT_LABELS[ex.equipment]}
                    {ex.user_id ? " · tuyo" : ""}
                  </span>
                </div>
                <PlusIcon size={16} className="shrink-0 text-[var(--text-tertiary)]" />
              </button>
            ))
          )}
        </div>
      </div>
    </Sheet>
  );
}
