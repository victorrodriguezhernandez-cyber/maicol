"use client";

import { useState } from "react";
import Link from "next/link";
import { BodyMap } from "./BodyMap";
import { TierLegend, TierBadge } from "./TierLegend";
import { MuscleIcon } from "./MuscleIcon";
import { MuscleDetailSheet } from "./MuscleDetailSheet";
import {
  TIER_COLORS,
  TIER_LABELS,
  overallLevel,
  summarizeLevels,
  type MuscleLevel,
  type MuscleStats,
  type Tier,
} from "@/lib/training/levels";
import { formatSets, type MuscleVolume } from "@/lib/training/volume";
import {
  MUSCLE_LABELS,
  MUSCLE_REGIONS,
  REGION_LABELS,
  VOLUME_LANDMARKS,
  type MuscleGroup,
} from "@/lib/training/muscles";
import { SectionHeader } from "@/components/ui/SectionHeader";

interface WeekVolume {
  weeksAgo: number;
  volume: MuscleVolume[];
}

/**
 * El cuerpo entero: el mapa con el rango de cada músculo, y debajo cada
 * grupo con su icono, su insignia y su evolución de volumen semanal.
 *
 * El mapa enseña el RANGO (acumulado, lo que has construido) y las barras
 * enseñan el VOLUMEN semanal (lo que has hecho últimamente). Son dos cosas
 * distintas a propósito: el rango dice dónde estás y las barras dicen si
 * sigues trabajando. Un músculo en oro con ocho barras vacías es alguien
 * que lo tuvo bien y lo ha abandonado, y eso sólo se ve teniendo las dos.
 */
export function MuscleEvolution({
  weeks,
  levels,
  stats,
  sessionsLogged,
}: {
  weeks: WeekVolume[];
  levels: MuscleLevel[];
  stats: Record<MuscleGroup, MuscleStats>;
  sessionsLogged: number;
}) {
  const [abierto, setAbierto] = useState<MuscleGroup | null>(null);

  const tiers = Object.fromEntries(levels.map((l) => [l.muscle, l.tier])) as Partial<
    Record<MuscleGroup, Tier>
  >;
  const general = overallLevel(levels);
  const resumen = summarizeLevels(levels);
  const estaSemana = weeks.find((w) => w.weeksAgo === 0)?.volume ?? [];

  const porRegion = new Map<string, MuscleLevel[]>();
  for (const l of levels) {
    const region = MUSCLE_REGIONS[l.muscle];
    const lista = porRegion.get(region) ?? [];
    lista.push(l);
    porRegion.set(region, lista);
  }

  /** Series efectivas por semana, de la más antigua a la más reciente. */
  function historia(muscle: MuscleGroup): number[] {
    return [...weeks]
      .sort((a, b) => b.weeksAgo - a.weeksAgo)
      .map((w) => w.volume.find((v) => v.muscle === muscle)?.sets ?? 0);
  }

  return (
    <>
      <section className="flex flex-col gap-3">
        <div className="surface-panel flex flex-col gap-4 p-4">
          {sessionsLogged === 0 ? (
            <p className="text-center text-sm text-[var(--text-secondary)]">
              Todavía no hay nada que enseñar aquí. Registra un entreno y los músculos que
              trabajes empezarán a coger color.
            </p>
          ) : (
            <div className="flex items-baseline justify-between gap-3">
              <span className="text-section">Nivel general</span>
              <span className="flex items-baseline gap-2">
                <span
                  className="text-display text-2xl"
                  style={{ color: TIER_COLORS[general.tier] }}
                >
                  {TIER_LABELS[general.tier]}
                </span>
                <span className="text-metric text-xs text-[var(--text-tertiary)]">
                  {Math.round(general.score)}/100
                </span>
              </span>
            </div>
          )}

          <BodyMap tiers={tiers} onSelect={setAbierto} selected={abierto} />
        </div>

        <div className="surface-panel p-4">
          <TierLegend counts={resumen} />
        </div>
      </section>

      {[...porRegion.entries()].map(([region, musculos]) => (
        <section key={region} className="flex flex-col gap-3">
          <SectionHeader>
            {REGION_LABELS[region as keyof typeof REGION_LABELS]}
          </SectionHeader>
          <div className="surface-panel flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
            {musculos.map((l) => (
              <button
                key={l.muscle}
                type="button"
                onClick={() => setAbierto(l.muscle)}
                className="flex items-center gap-3 p-4 text-left"
              >
                <span
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl"
                  style={{
                    background: `color-mix(in srgb, ${TIER_COLORS[l.tier]} 16%, transparent)`,
                    color: TIER_COLORS[l.tier],
                  }}
                >
                  <MuscleIcon muscle={l.muscle} size={22} />
                </span>

                <div className="flex min-w-0 flex-1 flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <span className="truncate text-sm font-medium text-[var(--text-primary)]">
                      {MUSCLE_LABELS[l.muscle]}
                    </span>
                    <TierBadge tier={l.tier} size="sm" />
                  </div>
                  <span className="text-[11px] text-[var(--text-tertiary)]">
                    {formatSets(
                      estaSemana.find((v) => v.muscle === l.muscle)?.sets ?? 0,
                    )}{" "}
                    series esta semana · mínimo {VOLUME_LANDMARKS[l.muscle].mev}
                  </span>
                </div>

                <Sparkline values={historia(l.muscle)} muscle={l.muscle} tier={l.tier} />
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

      <MuscleDetailSheet
        level={abierto ? (levels.find((l) => l.muscle === abierto) ?? null) : null}
        stats={abierto ? stats[abierto] : null}
        volume={abierto ? (estaSemana.find((v) => v.muscle === abierto) ?? null) : null}
        onClose={() => setAbierto(null)}
      />
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
function Sparkline({
  values,
  muscle,
  tier,
}: {
  values: number[];
  muscle: MuscleGroup;
  tier: Tier;
}) {
  const max = VOLUME_LANDMARKS[muscle].mrv;
  return (
    <span
      className="flex h-8 shrink-0 items-end gap-[2px]"
      aria-label={`Volumen por semana: ${values.map((v) => formatSets(v)).join(", ")} series`}
    >
      {values.map((v, i) => {
        const h = Math.max(2, Math.min(1, v / max) * 30);
        const ultima = i === values.length - 1;
        return (
          <span
            key={i}
            style={{
              height: `${h}px`,
              width: "4px",
              borderRadius: "2px",
              background:
                v === 0
                  ? "var(--surface-2)"
                  : ultima
                    ? TIER_COLORS[tier]
                    : `color-mix(in srgb, ${TIER_COLORS[tier]} 45%, var(--surface-2))`,
            }}
          />
        );
      })}
    </span>
  );
}
