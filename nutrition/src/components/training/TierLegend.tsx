"use client";

import {
  TIERS,
  TIER_COLORS,
  TIER_EDGE,
  TIER_LABELS,
  TIER_THRESHOLDS,
  TIER_DESCRIPTIONS,
  type Tier,
} from "@/lib/training/levels";

/**
 * La leyenda del mapa.
 *
 * Un mapa de colores sin leyenda no es información, es decoración: el
 * usuario ve que un músculo está morado y otro cobre y no puede hacer nada
 * con eso. Va debajo de la figura, siempre visible, no escondida detrás de
 * un icono de ayuda.
 *
 * `counts` marca cuántos músculos tienes en cada rango, para que la
 * leyenda además cuente tu estado y no sea sólo una tabla de colores.
 */
export function TierLegend({
  counts,
  compact = false,
}: {
  counts?: Record<Tier, number>;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1.5">
        {TIERS.filter((t) => t !== "sin_datos").map((tier) => (
          <span key={tier} className="flex items-center gap-1.5">
            <TierDot tier={tier} />
            <span className="text-[11px] text-[var(--text-secondary)]">
              {TIER_LABELS[tier]}
            </span>
            {counts && counts[tier] > 0 ? (
              <span className="text-metric text-[11px] text-[var(--text-primary)]">
                {counts[tier]}
              </span>
            ) : null}
          </span>
        ))}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2.5">
      {TIERS.map((tier) => (
        <div key={tier} className="flex items-start gap-2.5">
          <TierDot tier={tier} />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5">
            <div className="flex items-baseline justify-between gap-2">
              <span className="text-sm font-semibold text-[var(--text-primary)]">
                {TIER_LABELS[tier]}
              </span>
              <span className="text-metric shrink-0 text-[11px] text-[var(--text-tertiary)]">
                {tier === "sin_datos"
                  ? "0 puntos"
                  : tier === "diamante"
                    ? `${TIER_THRESHOLDS.diamante}–100`
                    : `${TIER_THRESHOLDS[tier]}–${nextThreshold(tier) - 1}`}
                {counts ? ` · ${counts[tier]} músculo${counts[tier] === 1 ? "" : "s"}` : ""}
              </span>
            </div>
            <span className="text-[11px] leading-relaxed text-[var(--text-secondary)]">
              {TIER_DESCRIPTIONS[tier]}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

function TierDot({ tier }: { tier: Tier }) {
  return (
    <span
      aria-hidden="true"
      className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded-full"
      style={{
        background: TIER_COLORS[tier],
        border: `1px solid ${TIER_EDGE[tier]}`,
      }}
    />
  );
}

function nextThreshold(tier: Tier): number {
  const orden: Tier[] = ["bronce", "plata", "oro", "platino", "diamante"];
  const i = orden.indexOf(tier);
  if (i < 0 || i >= orden.length - 1) return 101;
  return TIER_THRESHOLDS[orden[i + 1] as Exclude<Tier, "sin_datos">];
}

/**
 * La insignia de un rango, para ponerla junto a un nombre de músculo o de
 * grupo. Es lo que convierte una lista de texto en algo que apetece mirar.
 */
export function TierBadge({ tier, size = "md" }: { tier: Tier; size?: "sm" | "md" }) {
  const s = size === "sm" ? { px: "0.45rem", py: "0.12rem", fs: "9px" } : { px: "0.6rem", py: "0.2rem", fs: "10px" };
  return (
    <span
      className="inline-flex shrink-0 items-center rounded-full font-semibold uppercase"
      style={{
        padding: `${s.py} ${s.px}`,
        fontSize: s.fs,
        letterSpacing: "0.06em",
        background: `color-mix(in srgb, ${TIER_COLORS[tier]} 18%, transparent)`,
        color: TIER_COLORS[tier],
        border: `1px solid color-mix(in srgb, ${TIER_COLORS[tier]} 40%, transparent)`,
      }}
    >
      {TIER_LABELS[tier]}
    </span>
  );
}
