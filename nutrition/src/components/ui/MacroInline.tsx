import { formatGrams } from "@/lib/format";

/**
 * A compact, legible macro breakdown — a colored dot plus a real word
 * ("prot.", "carb.", "grasa") next to each value. Exists specifically so
 * no screen falls back to bare initials ("P · C · G"), which read as
 * cryptic rather than minimal. Uses the same --metric-* colors as the
 * macro chips on Hoy, so a protein value is recognizable by color across
 * the whole app, not just here.
 */
export function MacroInline({
  protein,
  carbs,
  fat,
  fiber,
  className = "",
}: {
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number | null;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-center gap-x-3 gap-y-1 ${className}`}>
      <MacroDot color="var(--metric-protein)" value={protein} label="prot." />
      <MacroDot color="var(--metric-carbs)" value={carbs} label="carb." />
      <MacroDot color="var(--metric-fat)" value={fat} label="grasa" />
      {fiber != null ? <MacroDot color="var(--metric-fiber)" value={fiber} label="fibra" /> : null}
    </div>
  );
}

function MacroDot({ color, value, label }: { color: string; value: number; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]">
      <span aria-hidden="true" className="h-1.5 w-1.5 shrink-0 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-numeric font-medium text-[var(--text-primary)]">{formatGrams(value)}</span>
      {label}
    </span>
  );
}
