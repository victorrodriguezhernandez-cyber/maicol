"use client";

import { useState } from "react";
import Link from "next/link";
import { BodyMap } from "./BodyMap";
import { VolumeExplainer } from "./VolumeExplainer";
import {
  volumeIntensity,
  formatSets,
  VOLUME_STATUS_LABELS,
  VOLUME_STATUS_COLOR,
  type MuscleVolume,
} from "@/lib/training/volume";
import {
  MUSCLE_LABELS,
  MUSCLE_REGIONS,
  REGION_LABELS,
  VOLUME_LANDMARKS,
  type MuscleGroup,
} from "@/lib/training/muscles";
import { weekLabel } from "@/lib/training/week";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface WeekVolume {
  weeksAgo: number;
  volume: MuscleVolume[];
}

/**
 * El cuerpo entero: el mapa de una semana y, debajo, cada músculo con su
 * evolución en las últimas ocho.
 *
 * El deslizador de semanas cambia el mapa. Poder mirar atrás es lo que
 * convierte esto en seguimiento y no en una foto: "esta semana voy corto
 * de dorsal" importa mucho menos que "llevo cuatro semanas corto".
 */
export function MuscleEvolution({ weeks }: { weeks: WeekVolume[] }) {
  const [view, setView] = useState<"frente" | "espalda">("frente");
  const [weekIndex, setWeekIndex] = useState(0);
  const [explaining, setExplaining] = useState<MuscleVolume | null>(null);

  const current = weeks[weekIndex]?.volume ?? [];
  const intensity = Object.fromEntries(
    current.map((v) => [v.muscle, volumeIntensity(v)]),
  ) as Partial<Record<MuscleGroup, number>>;

  const byRegion = new Map<string, MuscleVolume[]>();
  for (const v of current) {
    const region = MUSCLE_REGIONS[v.muscle];
    const list = byRegion.get(region) ?? [];
    list.push(v);
    byRegion.set(region, list);
  }

  /** Series efectivas de un músculo en cada una de las ocho semanas,
   *  de la más antigua a la más reciente (así se lee el gráfico). */
  function historyFor(muscle: MuscleGroup): number[] {
    return [...weeks]
      .sort((a, b) => b.weeksAgo - a.weeksAgo)
      .map((w) => w.volume.find((v) => v.muscle === muscle)?.sets ?? 0);
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <SectionHeader
          action={
            <SegmentedControl
              value={view}
              onChange={setView}
              options={[
                { value: "frente", label: "Frente" },
                { value: "espalda", label: "Espalda" },
              ]}
            />
          }
        >
          {weekLabel(weeks[weekIndex]?.weeksAgo ?? 0)}
        </SectionHeader>

        <div className="surface-panel flex flex-col gap-4 p-4">
          <div className="mx-auto w-full max-w-[16rem]">
            <BodyMap
              view={view}
              intensity={intensity}
              onSelect={(m) => {
                const v = current.find((x) => x.muscle === m);
                if (v) setExplaining(v);
              }}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <input
              type="range"
              min={0}
              max={weeks.length - 1}
              value={weeks.length - 1 - weekIndex}
              onChange={(e) => setWeekIndex(weeks.length - 1 - Number(e.target.value))}
              aria-label="Semana"
              className="w-full accent-[var(--accent)]"
            />
            <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
              <span>Hace {weeks.length - 1} semanas</span>
              <span>Esta semana</span>
            </div>
          </div>
        </div>
      </section>

      {[...byRegion.entries()].map(([region, muscles]) => (
        <section key={region} className="flex flex-col gap-3">
          <SectionHeader>{REGION_LABELS[region as keyof typeof REGION_LABELS]}</SectionHeader>
          <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
            {muscles.map((v) => (
              <button
                key={v.muscle}
                type="button"
                onClick={() => setExplaining(v)}
                className="flex items-center gap-3 p-4 text-left"
              >
                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <span className="text-sm font-medium text-[var(--text-primary)]">
                    {MUSCLE_LABELS[v.muscle]}
                  </span>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {formatSets(v.sets)} series · rango {VOLUME_LANDMARKS[v.muscle].mev}–
                    {VOLUME_LANDMARKS[v.muscle].mavMax}
                  </span>
                </div>

                <Sparkline values={historyFor(v.muscle)} muscle={v.muscle} />

                <span
                  className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                  style={{
                    background: `color-mix(in srgb, ${VOLUME_STATUS_COLOR[v.status]} 15%, transparent)`,
                    color: VOLUME_STATUS_COLOR[v.status],
                  }}
                >
                  {VOLUME_STATUS_LABELS[v.status]}
                </span>
              </button>
            ))}
          </div>
        </section>
      ))}

      <Link
        href="/entreno/ejercicios"
        className="btn-secondary tap-scale rounded-xl py-3 text-center text-sm font-semibold text-[var(--text-primary)]"
      >
        Ver el catálogo de ejercicios
      </Link>

      <VolumeExplainer volume={explaining} onClose={() => setExplaining(null)} />
    </>
  );
}

/**
 * Ocho barras: una por semana, de la más antigua a la más reciente.
 *
 * La escala es la misma para todas las semanas de ESE músculo (su techo
 * recuperable), no el máximo de la serie. Con escala relativa, un músculo
 * que sólo has entrenado una vez dibujaría una barra a tope y parecería
 * que va sobrado.
 */
function Sparkline({ values, muscle }: { values: number[]; muscle: MuscleGroup }) {
  const max = VOLUME_LANDMARKS[muscle].mrv;
  return (
    <span
      className="flex h-7 shrink-0 items-end gap-[2px]"
      aria-label={`Evolución: ${values.map((v) => formatSets(v)).join(", ")} series por semana`}
    >
      {values.map((v, i) => {
        const h = Math.max(2, Math.min(1, v / max) * 28);
        const isLast = i === values.length - 1;
        return (
          <span
            key={i}
            style={{
              height: `${h}px`,
              width: "4px",
              borderRadius: "2px",
              background: isLast
                ? "var(--accent)"
                : v === 0
                  ? "var(--surface-2)"
                  : "color-mix(in srgb, var(--accent) 35%, var(--surface-2))",
            }}
          />
        );
      })}
    </span>
  );
}
