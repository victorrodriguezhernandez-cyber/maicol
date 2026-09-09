/**
 * Maicol's own mark — a monoline pulse/leaf shape, not another "M in a
 * rounded square" app-icon cliché. Reads as a heartbeat line crossed
 * with a sprouting leaf: nutrition + a living metric, both literal to
 * what this app tracks. Pure SVG, no image asset, so it's crisp at any
 * size and free in both themes.
 */
export function LogoMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path
        d="M3 13.5h3.4l1.8-4.6 2.6 9.4 2.4-11.8 2 7h3.8"
        stroke="var(--accent)"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Mark + wordmark, sized down for the sticky header — `full` adds the
 * "NUTRICIÓN" kicker for places with room to breathe (login, splash). */
export function Logo({ full = false, className = "" }: { full?: boolean; className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <LogoMark size={full ? 26 : 18} />
      <div className="flex flex-col leading-none">
        <span
          className={`font-semibold tracking-tight text-[var(--text-primary)] ${full ? "text-lg" : "text-[13px]"}`}
        >
          Maicol
        </span>
        {full ? (
          <span className="text-[10px] font-semibold uppercase tracking-[0.16em] text-[var(--text-tertiary)]">
            Nutrición
          </span>
        ) : null}
      </div>
    </div>
  );
}
