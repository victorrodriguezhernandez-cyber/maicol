import { formatGrams } from "@/lib/format";

/** A full-width macro row — label, consumed/goal, and a bar underneath —
 * used stacked in a list (Hoy, day detail) instead of a grid of equal
 * chips, so "how much protein have I had" reads at a glance without
 * doing mental math across four identical tiles. */
export function MetricBar({
  label,
  value,
  goal,
  color,
}: {
  label: string;
  value: number;
  goal: number;
  color: string;
}) {
  const pct = goal > 0 ? Math.min(100, Math.max(0, (value / goal) * 100)) : 0;
  const over = goal > 0 && value > goal;
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-baseline justify-between">
        <span className="flex items-center gap-1.5 text-[13px] font-medium text-[var(--text-primary)]">
          <span aria-hidden="true" className="h-2 w-2 rounded-full" style={{ backgroundColor: color }} />
          {label}
        </span>
        <span className="text-metric text-xs text-[var(--text-secondary)]">
          <span className="text-[var(--text-primary)]">{formatGrams(value)}</span> / {formatGrams(goal)}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-2)]">
        <div
          className="h-full rounded-full transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%`, backgroundColor: over ? "var(--warning)" : color }}
        />
      </div>
    </div>
  );
}
