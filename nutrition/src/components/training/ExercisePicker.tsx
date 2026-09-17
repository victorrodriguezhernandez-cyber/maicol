"use client";

import { useEffect, useRef, useState } from "react";
import { Sheet } from "@/components/ui/Sheet";
import { Skeleton } from "@/components/ui/Skeleton";
import { SearchIcon, PlusIcon } from "@/components/ui/icons";
import {
  MUSCLE_LABELS,
  MUSCLE_REGIONS,
  MUSCLE_REGION_ORDER,
  REGION_LABELS,
  type MuscleGroup,
  type MuscleRegion,
} from "@/lib/training/muscles";
import { EQUIPMENT_LABELS, type ExerciseRow, type Equipment } from "@/lib/training/types";
import Link from "next/link";

/**
 * Qué lista se está mirando.
 *
 * `"comunes"` es la de arranque: al abrir el selector no hay ninguna
 * pregunta hecha todavía, y una lista alfabética de todo el catálogo —
 * que empieza por "Abducción de cadera en máquina" — es peor que inútil
 * para quien está montando su primera rutina. Los comunes son los que
 * reconoce cualquiera que haya pisado un gimnasio.
 */
type Filtro = { tipo: "comunes" } | { tipo: "todos" } | { tipo: "zona"; zona: MuscleRegion };

/**
 * El selector de ejercicios.
 *
 * ── Por zona, no por los 17 músculos ────────────────────────────────────
 *
 * Los filtros eran los 17 grupos musculares, uno por chip: "Hombro
 * anterior", "Hombro lateral", "Hombro posterior"… Eso obliga a saber
 * anatomía antes de poder buscar un press de hombro, y la pregunta real
 * en el gimnasio es "qué hago de hombro". Ahora los chips son las seis
 * zonas y la parte concreta va DENTRO de cada ejercicio, como nota: ahí
 * sí importa, porque es lo que distingue una elevación lateral de un
 * press, y ahí no estorba para elegir.
 *
 * Los 17 grupos siguen siendo la unidad con la que se mide el volumen —
 * eso no cambia. Lo que cambia es que no son la unidad con la que se
 * elige.
 *
 * ── Y por material ──────────────────────────────────────────────────────
 *
 * La otra pregunta real: "qué puedo hacer con lo que hay libre". El texto
 * libre está para cuando ya sabes el nombre.
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
  /**
   * Con qué músculo llega el selector, cuando se abre desde un sitio que
   * ya lo sabe (el mapa corporal, un hueco de la rutina). Se traduce a su
   * zona: si vienes de "hombro lateral" quieres ver todo el hombro, no
   * sólo las laterales.
   */
  initialMuscle?: MuscleGroup | null;
}) {
  const [query, setQuery] = useState("");
  const [filtro, setFiltro] = useState<Filtro>(
    initialMuscle
      ? { tipo: "zona", zona: MUSCLE_REGIONS[initialMuscle] }
      : { tipo: "comunes" },
  );
  const [equipment, setEquipment] = useState<Equipment | null>(null);
  const [results, setResults] = useState<ExerciseRow[] | null>(null);
  const [failed, setFailed] = useState(false);
  const abortRef = useRef<AbortController | null>(null);

  // Buscar por nombre es una pregunta sobre TODO el catálogo: si el
  // filtro siguiera puesto en "Más comunes", escribir "sissy" no
  // encontraría nada y parecería que el ejercicio no existe.
  const buscando = query.trim().length > 0;

  useEffect(() => {
    if (!open) return;
    const controller = new AbortController();
    abortRef.current?.abort();
    abortRef.current = controller;

    const params = new URLSearchParams();
    if (buscando) params.set("q", query.trim());
    if (!buscando) {
      if (filtro.tipo === "zona") params.set("zona", filtro.zona);
      if (filtro.tipo === "comunes") params.set("comunes", "1");
    }
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
  }, [open, query, buscando, filtro, equipment]);

  if (!open) return null;

  // Buscando por nombre no hay chip activo: el texto manda sobre el
  // filtro, y dejar uno encendido diría que también está aplicado.
  const chipActivo = (f: Filtro) => !buscando && mismoFiltro(f, filtro);

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
          <Chip activo={chipActivo({ tipo: "comunes" })} onClick={() => setFiltro({ tipo: "comunes" })}>
            Más comunes
          </Chip>
          {MUSCLE_REGION_ORDER.map((zona) => (
            <Chip
              key={zona}
              activo={chipActivo({ tipo: "zona", zona })}
              onClick={() => setFiltro({ tipo: "zona", zona })}
            >
              {REGION_LABELS[zona]}
            </Chip>
          ))}
          <Chip activo={chipActivo({ tipo: "todos" })} onClick={() => setFiltro({ tipo: "todos" })}>
            Todos
          </Chip>
        </div>

        <div className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
          {(Object.keys(EQUIPMENT_LABELS) as Equipment[]).map((eq) => (
            <Chip
              key={eq}
              activo={equipment === eq}
              onClick={() => setEquipment(equipment === eq ? null : eq)}
            >
              {EQUIPMENT_LABELS[eq]}
            </Chip>
          ))}
        </div>

        {!buscando && filtro.tipo === "comunes" ? (
          <p className="text-[11px] leading-snug text-[var(--text-tertiary)]">
            Una selección de los que se hacen en casi cualquier gimnasio, para no empezar por una
            lista alfabética de todo. No es un ranking de uso: la app no ve lo que entrena nadie
            más. Toca una zona o «Todos» para el catálogo completo.
          </p>
        ) : null}

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
                  {/* Aquí sí va la parte concreta del músculo: es lo que
                      distingue dos ejercicios que se llaman parecido. */}
                  <span className="text-[11px] text-[var(--text-tertiary)]">
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

function mismoFiltro(a: Filtro, b: Filtro): boolean {
  if (a.tipo === "zona" && b.tipo === "zona") return a.zona === b.zona;
  return a.tipo === b.tipo;
}

function Chip({
  activo,
  onClick,
  children,
}: {
  activo: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-active={activo ? "true" : undefined}
      className="btn-pill shrink-0 px-3 py-1.5 text-xs"
    >
      {children}
    </button>
  );
}
