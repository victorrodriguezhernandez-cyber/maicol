import { formatGrams } from "@/lib/format";
import { ProgressBar } from "@/components/ui/ProgressBar";

/**
 * A compact macro stat — dot, value/goal, progress bar. Used on Hoy for
 * today's live totals and on the diary day-detail page for a past day's
 * totals, so both read the same way instead of the day-detail page
 * showing kcal alone with no macro breakdown.
 */
export function MacroChip({
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
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center gap-1.5">
        <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
        <span className="text-[11px] text-[var(--text-secondary)]">{label}</span>
      </div>
      <p className="font-numeric text-base font-semibold text-[var(--text-primary)]">
        {formatGrams(value)}
        <span className="text-xs font-normal text-[var(--text-tertiary)]"> /{formatGrams(goal)}</span>
      </p>
      <ProgressBar value={value} max={goal} color={color} />
    </div>
  );
}
