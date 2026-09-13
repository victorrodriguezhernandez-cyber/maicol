"use client";

import Link from "next/link";
import { Sheet } from "@/components/ui/Sheet";
import { TierBadge } from "./TierLegend";
import { MuscleIcon } from "./MuscleIcon";
import { explainLevel, TIER_COLORS, type MuscleLevel, type MuscleStats } from "@/lib/training/levels";
import {
  explainVolume,
  VOLUME_STATUS_LABELS,
  VOLUME_STATUS_COLOR,
  formatSets,
  type MuscleVolume,
} from "@/lib/training/volume";
import { MUSCLE_LABELS } from "@/lib/training/muscles";

/**
 * Todo lo que la app sabe de un músculo, al tocarlo en el mapa.
 *
 * Junta las dos cosas que antes estaban separadas y contestaban preguntas
 * distintas: el RANGO (cómo llevas este músculo en general, que es el
 * color de la figura) y el VOLUMEN DE ESTA SEMANA (si vas corto hoy). Las
 * dos se enseñan juntas porque un músculo en oro que esta semana va corto
 * y uno en bronce que va sobrado necesitan consejos opuestos, y con una
 * sola de las dos cifras no se distinguen.
 *
 * Todo el texto sale de `explainLevel()` y `explainVolume()`, que están
 * probados músculo a músculo. Ninguna etiqueta llega a pantalla sin su
 * justificación detrás — regla 9 del proyecto.
 */
export function MuscleDetailSheet({
  level,
  stats,
  volume,
  onClose,
}: {
  level: MuscleLevel | null;
  stats: MuscleStats | null;
  volume: MuscleVolume | null;
  onClose: () => void;
}) {
  if (!level || !stats) return null;

  const nivel = explainLevel(level, stats);
  const nombre = MUSCLE_LABELS[level.muscle];

  return (
    <Sheet open onOpenChange={onClose} title={nombre}>
      <div className="flex flex-col gap-5">
        <div className="flex items-center gap-3">
          <span
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
            style={{
              background: `color-mix(in srgb, ${TIER_COLORS[level.tier]} 16%, transparent)`,
              color: TIER_COLORS[level.tier],
            }}
          >
            <MuscleIcon muscle={level.muscle} size={26} />
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1">
            <div className="flex items-center gap-2">
              <span className="text-lg font-semibold text-[var(--text-primary)]">{nombre}</span>
              <TierBadge tier={level.tier} />
            </div>
            <span className="text-metric text-xs text-[var(--text-secondary)]">
              {Math.round(level.score)} / 100
            </span>
          </div>
        </div>

        {/* La barra de progreso hacia el siguiente rango. */}
        <div className="flex flex-col gap-1.5">
          <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
            <span
              className="block h-full rounded-full"
              style={{
                width: `${Math.max(2, Math.min(100, level.score))}%`,
                background: TIER_COLORS[level.tier],
                transition: "width 400ms ease",
              }}
            />
          </div>
          {level.next ? (
            <span className="text-[11px] text-[var(--text-tertiary)]">
              {level.next.pointsAway} puntos para {level.next.tier}
            </span>
          ) : null}
        </div>

        <div className="flex flex-col gap-2.5">
          {nivel.lines.map((line, i) => (
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

        {nivel.todo.length > 0 ? (
          <div className="surface-soft flex flex-col gap-2 p-4">
            <span className="text-section">Para subir</span>
            {nivel.todo.map((t, i) => (
              <p key={i} className="text-[13px] leading-relaxed text-[var(--text-secondary)]">
                · {t}
              </p>
            ))}
          </div>
        ) : null}

        {volume ? (
          <details className="surface-soft overflow-hidden rounded-2xl">
            <summary className="flex cursor-pointer items-center justify-between gap-2 p-4">
              <span className="text-sm font-medium text-[var(--text-primary)]">
                Esta semana: {formatSets(volume.sets)} series
              </span>
              <span
                className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold"
                style={{
                  background: `color-mix(in srgb, ${VOLUME_STATUS_COLOR[volume.status]} 15%, transparent)`,
                  color: VOLUME_STATUS_COLOR[volume.status],
                }}
              >
                {VOLUME_STATUS_LABELS[volume.status]}
              </span>
            </summary>
            <div className="flex flex-col gap-2 border-t border-[var(--border-soft)] p-4">
              {explainVolume(volume).lines.map((line, i) => (
                <p key={i} className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
                  {line}
                </p>
              ))}
            </div>
          </details>
        ) : null}

        <Link
          href={`/entreno/ejercicios?musculo=${level.muscle}`}
          onClick={onClose}
          className="btn-secondary tap-scale rounded-xl py-3 text-center text-sm font-semibold text-[var(--text-primary)]"
        >
          Ejercicios de {nombre.toLowerCase()}
        </Link>
      </div>
    </Sheet>
  );
}
