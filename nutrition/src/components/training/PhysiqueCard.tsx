"use client";

import { useState } from "react";
import Link from "next/link";
import { BodyMap } from "./BodyMap";
import { TierLegend, TierBadge } from "./TierLegend";
import { MuscleIcon } from "./MuscleIcon";
import { MuscleDetailSheet } from "./MuscleDetailSheet";
import {
  summarizeLevels,
  overallLevel,
  TIER_COLORS,
  TIER_LABELS,
  type MuscleLevel,
  type MuscleStats,
  type Tier,
} from "@/lib/training/levels";
import { type MuscleVolume } from "@/lib/training/volume";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";
import { SectionHeader } from "@/components/ui/SectionHeader";

/**
 * Tu físico: el mapa con el rango de cada músculo, el nivel general y los
 * músculos que piden atención.
 *
 * Sustituye a la tarjeta de volumen semanal. El volumen sigue estando —
 * dentro de la ficha de cada músculo, y en la lista de "pide atención" —
 * pero ya no es lo que pinta el cuerpo. El volumen de una semana no cuenta
 * ninguna historia: entrenases seis meses o seis días, una semana floja te
 * dejaba el cuerpo apagado. El rango sí acumula, y eso es lo que hace que
 * haya algo que ver crecer.
 */
export function PhysiqueCard({
  levels,
  stats,
  volume,
  sessionsLogged,
}: {
  levels: MuscleLevel[];
  stats: Record<MuscleGroup, MuscleStats>;
  volume: MuscleVolume[];
  /** Entrenos registrados en total. Decide si hay algo que contar. */
  sessionsLogged: number;
}) {
  const [abierto, setAbierto] = useState<MuscleGroup | null>(null);

  const tiers = Object.fromEntries(levels.map((l) => [l.muscle, l.tier])) as Partial<
    Record<MuscleGroup, Tier>
  >;
  const resumen = summarizeLevels(levels);
  const general = overallLevel(levels);

  // Los que piden atención: sin tocar o muy por debajo. Ordenados por
  // puntuación, los peores primero.
  const atencion = [...levels]
    .filter((l) => l.tier === "sin_datos" || l.score < 20)
    .sort((a, b) => a.score - b.score)
    .slice(0, 5);

  const levelDe = (m: MuscleGroup) => levels.find((l) => l.muscle === m) ?? null;
  const volumenDe = (m: MuscleGroup) => volume.find((v) => v.muscle === m) ?? null;

  return (
    <section className="flex flex-col gap-3">
      <SectionHeader
        action={
          <Link
            href="/entreno/musculos"
            className="text-xs font-semibold"
            style={{ color: "var(--accent-2)" }}
          >
            Detalle
          </Link>
        }
      >
        Tu físico
      </SectionHeader>

      <div className="surface-panel flex flex-col gap-4 p-4">
        {sessionsLogged === 0 ? (
          <p className="text-center text-sm text-[var(--text-secondary)]">
            Cuando registres tu primer entreno, los músculos que trabajes empezarán a
            encenderse aquí.
          </p>
        ) : (
          <div className="flex items-center justify-between gap-3">
            <div className="flex flex-col gap-0.5">
              <span className="text-section">Nivel general</span>
              <div className="flex items-center gap-2">
                <span
                  className="text-display text-2xl"
                  style={{ color: TIER_COLORS[general.tier] }}
                >
                  {TIER_LABELS[general.tier]}
                </span>
                <span className="text-metric text-xs text-[var(--text-tertiary)]">
                  {Math.round(general.score)}/100
                </span>
              </div>
            </div>
            <span className="text-right text-[11px] leading-relaxed text-[var(--text-tertiary)]">
              Media de los 17 músculos,
              <br />
              los que no entrenas incluidos
            </span>
          </div>
        )}

        <BodyMap tiers={tiers} onSelect={setAbierto} selected={abierto} />

        <TierLegend compact counts={resumen} />

        <p className="text-center text-[11px] text-[var(--text-tertiary)]">
          Toca un músculo para ver su nivel y qué te falta para subirlo.
        </p>
      </div>

      {atencion.length > 0 && sessionsLogged > 0 ? (
        <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
          <p className="px-4 pb-2 pt-3.5 text-section">Lo que te falta</p>
          {atencion.map((l) => (
            <button
              key={l.muscle}
              type="button"
              onClick={() => setAbierto(l.muscle)}
              className="flex items-center gap-3 p-4 text-left"
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl"
                style={{
                  background: `color-mix(in srgb, ${TIER_COLORS[l.tier]} 16%, transparent)`,
                  color: TIER_COLORS[l.tier],
                }}
              >
                <MuscleIcon muscle={l.muscle} size={20} />
              </span>
              <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                  {MUSCLE_LABELS[l.muscle]}
                </span>
                <span className="text-[11px] text-[var(--text-tertiary)]">
                  {l.tier === "sin_datos"
                    ? "Todavía sin entrenar"
                    : `${Math.round(l.score)}/100 · te faltan ${l.next?.pointsAway ?? 0} para ${l.next ? TIER_LABELS[l.next.tier].toLowerCase() : ""}`}
                </span>
              </span>
              <TierBadge tier={l.tier} size="sm" />
            </button>
          ))}
        </div>
      ) : null}

      <MuscleDetailSheet
        level={abierto ? levelDe(abierto) : null}
        stats={abierto ? stats[abierto] : null}
        volume={abierto ? volumenDe(abierto) : null}
        onClose={() => setAbierto(null)}
      />
    </section>
  );
}
