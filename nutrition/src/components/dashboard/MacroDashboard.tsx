import { formatGrams } from "@/lib/format";

interface MacroSpec {
  label: string;
  value: number;
  goal: number;
  color: string;
}

/**
 * The four macros as one tight 2×2 dashboard panel — replaces four
 * full-width stacked rows, which read as a form rather than a
 * dashboard. Each cell is compact (label + figure on one line, a thick
 * bar under it) so the whole thing takes roughly half the vertical
 * space a stacked list would, per the "no desperdiciar espacio
 * vertical" brief.
 */
export function MacroDashboard({ macros }: { macros: MacroSpec[] }) {
  return (
    <div className="surface-panel grid grid-cols-2 gap-x-4 gap-y-3.5 p-4">
      {macros.map((m) => (
        <MacroCell key={m.label} {...m} />
      ))}
    </div>
  );
}

function MacroCell({ label, value, goal, color }: MacroSpec) {
  const pct = goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between gap-1">
        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-[var(--text-secondary)]">
          <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
      </div>
      <p className="text-metric text-[15px] leading-none text-[var(--text-primary)]">
        {formatGrams(value)}
        <span className="text-[11px] font-normal text-[var(--text-tertiary)]"> /{formatGrams(goal)}</span>
      </p>
      <div className="h-[5px] w-full overflow-hidden rounded-full bg-[var(--surface)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: over ? "var(--warning)" : color }}
        />
      </div>
    </div>
  );
}
