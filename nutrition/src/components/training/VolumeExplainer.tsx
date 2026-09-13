"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import {
  explainVolume,
  VOLUME_STATUS_LABELS,
  VOLUME_STATUS_COLOR,
  formatSets,
  type MuscleVolume,
} from "@/lib/training/volume";
import { VOLUME_LANDMARKS, MUSCLE_LABELS } from "@/lib/training/muscles";

/**
 * La justificación de una etiqueta de volumen.
 *
 * Existe porque una etiqueta suelta ("volumen alto") no es información:
 * es una afirmación sin respaldo, y una app que reparte juicios sin poder
 * defenderlos acaba ignorada. Aquí se enseña el número exacto, el rango
 * contra el que se compara, de dónde sale ese rango, cómo se cuentan las
 * series y — lo más importante — que son medias de población y no una ley
 * que se aplique a ti en particular.
 *
 * Todo el texto sale de `explainVolume()`, que está probado músculo a
 * músculo: no hay forma de que una etiqueta llegue a pantalla sin su
 * explicación detrás.
 */
export function VolumeExplainer({
  volume,
  onClose,
}: {
  volume: MuscleVolume | null;
  onClose: () => void;
}) {
  if (!volume) return null;

  const { title, lines } = explainVolume(volume);
  const landmarks = VOLUME_LANDMARKS[volume.muscle];
  const color = VOLUME_STATUS_COLOR[volume.status];

  // Posición en la barra: se escala hasta un poco más allá del techo
  // recuperable, para que "por encima del máximo" tenga sitio donde
  // dibujarse en vez de quedarse clavado al borde.
  const scaleMax = landmarks.mrv * 1.25;
  const pct = (n: number) => `${Math.min(100, (n / scaleMax) * 100)}%`;

  return (
    <Sheet open onOpenChange={onClose} title={title}>
      <div className="flex flex-col gap-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="text-display text-3xl text-[var(--text-primary)]">
            {formatSets(volume.sets)}
          </span>
          <span
            className="rounded-full px-3 py-1 text-xs font-semibold"
            style={{ background: `color-mix(in srgb, ${color} 15%, transparent)`, color }}
          >
            {VOLUME_STATUS_LABELS[volume.status]}
          </span>
        </div>

        {/* La escala, dibujada. Ver dónde caes es más rápido que leerlo. */}
        <div className="flex flex-col gap-2">
          <div className="relative h-2.5 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <span
              className="absolute inset-y-0 left-0"
              style={{
                left: pct(landmarks.mev),
                width: `calc(${pct(landmarks.mavMax)} - ${pct(landmarks.mev)})`,
                background: "color-mix(in srgb, var(--success) 40%, transparent)",
              }}
            />
            <span
              className="absolute inset-y-0"
              style={{
                left: pct(landmarks.mavMax),
                width: `calc(${pct(landmarks.mrv)} - ${pct(landmarks.mavMax)})`,
                background: "color-mix(in srgb, var(--warning) 35%, transparent)",
              }}
            />
            <span
              className="absolute top-1/2 h-4 w-1 -translate-y-1/2 rounded-full"
              style={{ left: pct(volume.sets), background: color }}
            />
          </div>
          <div className="flex justify-between text-[10px] text-[var(--text-tertiary)]">
            <span>0</span>
            <span>mín. {landmarks.mev}</span>
            <span>óptimo hasta {landmarks.mavMax}</span>
            <span>techo {landmarks.mrv}</span>
          </div>
        </div>

        <div className="flex flex-col gap-3">
          {lines.map((line, i) => (
            <p
              key={i}
              className={
                i === 0
                  ? "text-sm text-[var(--text-primary)]"
                  : "text-[13px] leading-relaxed text-[var(--text-secondary)]"
              }
            >
              {line}
            </p>
          ))}
        </div>

        <Link
          href={`/entreno/ejercicios?musculo=${volume.muscle}`}
          onClick={onClose}
          className="btn-secondary tap-scale rounded-xl py-3 text-center text-sm font-semibold text-[var(--text-primary)]"
        >
          Ver ejercicios de {MUSCLE_LABELS[volume.muscle].toLowerCase()}
        </Link>
      </div>
    </Sheet>
  );
}
