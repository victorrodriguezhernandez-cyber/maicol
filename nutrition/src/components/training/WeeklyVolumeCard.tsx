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
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";
import { SegmentedControl } from "@/components/ui/SegmentedControl";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * El volumen de la semana: el mapa del cuerpo y los músculos que piden
 * atención.
 *
 * Sólo se listan los que están fuera de rango. Enseñar los 17 cada semana
 * convertiría la tarjeta en una tabla que nadie lee; lo que hace falta
 * saber de un vistazo es qué te falta y de qué te has pasado. El resto
 * está en el mapa y en `/entreno/musculos`.
 */
export function WeeklyVolumeCard({ volume }: { volume: MuscleVolume[] }) {
  const [view, setView] = useState<"frente" | "espalda">("frente");
  const [explaining, setExplaining] = useState<MuscleVolume | null>(null);

  const intensity = Object.fromEntries(
    volume.map((v) => [v.muscle, volumeIntensity(v)]),
  ) as Partial<Record<MuscleGroup, number>>;

  const trabajados = volume.filter((v) => v.sets > 0);
  const cortos = volume.filter((v) => v.status === "por_debajo");
  const pasados = volume.filter((v) => v.status === "alto" || v.status === "por_encima");
  const totalSeries = volume.reduce((sum, v) => sum + v.directSets, 0);

  return (
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
        Volumen de esta semana
      </SectionHeader>

      <div className="surface-panel flex flex-col gap-4 p-4">
        {totalSeries === 0 ? (
          <p className="py-2 text-center text-sm text-[var(--text-secondary)]">
            Esta semana todavía no has registrado ninguna serie.
          </p>
        ) : (
          <p className="text-sm text-[var(--text-secondary)]">
            <span className="text-metric text-[var(--text-primary)]">{totalSeries}</span> series
            en {trabajados.length} grupos musculares.
          </p>
        )}

        <div className="mx-auto w-full max-w-[15rem]">
          <BodyMap
            view={view}
            intensity={intensity}
            onSelect={(muscle) => {
              const v = volume.find((x) => x.muscle === muscle);
              if (v) setExplaining(v);
            }}
          />
        </div>

        <p className="text-center text-[11px] text-[var(--text-tertiary)]">
          Toca un músculo para ver su volumen y por qué se clasifica así.
        </p>

        {cortos.length > 0 || pasados.length > 0 ? (
          <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] pt-3">
            {[...cortos, ...pasados].slice(0, 6).map((v) => (
              <button
                key={v.muscle}
                type="button"
                onClick={() => setExplaining(v)}
                className="flex items-center justify-between gap-3 text-left"
              >
                <span className="text-sm text-[var(--text-primary)]">
                  {MUSCLE_LABELS[v.muscle]}
                </span>
                <span className="flex items-center gap-2">
                  <span className="text-metric text-xs text-[var(--text-secondary)]">
                    {formatSets(v.sets)}
                  </span>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold"
                    style={{
                      background: `color-mix(in srgb, ${VOLUME_STATUS_COLOR[v.status]} 15%, transparent)`,
                      color: VOLUME_STATUS_COLOR[v.status],
                    }}
                  >
                    {VOLUME_STATUS_LABELS[v.status]}
                  </span>
                </span>
              </button>
            ))}
          </div>
        ) : null}

        <Link
          href="/entreno/musculos"
          className="text-center text-xs font-semibold"
          style={{ color: "var(--accent-2)" }}
        >
          Ver todos los músculos y su evolución
        </Link>
      </div>

      <VolumeExplainer volume={explaining} onClose={() => setExplaining(null)} />
    </section>
  );
}
