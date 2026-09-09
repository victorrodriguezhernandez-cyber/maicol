/**
 * The one dominant number on a screen — today's kcal on Hoy, current
 * weight on Progreso — paired with a ring. This is the composition that
 * makes a screen feel like it has a hero instead of a stack of
 * equal-weight tiles: everything else on the screen must read smaller
 * than this. `value`/`unit` render at `.text-display` scale; `ring`
 * slots in the RingProgress (or any other radial mark) at a fixed size
 * so the two halves stay visually balanced across screens.
 */
export function HeroMetric({
  eyebrow,
  value,
  unit,
  support,
  ring,
}: {
  eyebrow: string;
  value: React.ReactNode;
  unit?: string;
  support?: React.ReactNode;
  ring?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className="flex min-w-0 flex-col gap-2.5">
        <p className="text-section">{eyebrow}</p>
        <div className="flex items-baseline gap-2">
          <span className="text-display text-[2.9rem] text-[var(--text-primary)]">{value}</span>
          {unit ? <span className="text-sm font-medium text-[var(--text-secondary)]">{unit}</span> : null}
        </div>
        {support ? <p className="text-xs text-[var(--text-tertiary)]">{support}</p> : null}
      </div>
      {ring ? <div className="shrink-0">{ring}</div> : null}
    </div>
  );
}
