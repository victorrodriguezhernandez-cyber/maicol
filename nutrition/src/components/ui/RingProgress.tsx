/**
 * A single radial progress ring — deliberately one ring, not Apple's three,
 * so it reads as "this app's own instrument" rather than a lift from
 * Activity. Used where a value's proportion of a goal is itself the point
 * (today's kcal on Hoy) — everywhere else stays a flat ProgressBar so the
 * ring stays a signature, not a repeated motif. `glow` adds a soft blurred
 * halo behind the ring (used on Hoy's hero, where the ring has to carry
 * real visual weight) — off by default for smaller, secondary uses.
 */
export function RingProgress({
  value,
  max,
  size = 72,
  strokeWidth = 7,
  color = "var(--accent)",
  trackColor = "var(--surface-2)",
  glow = false,
  children,
}: {
  value: number;
  max: number;
  size?: number;
  strokeWidth?: number;
  color?: string;
  trackColor?: string;
  glow?: boolean;
  children?: React.ReactNode;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const pct = max > 0 ? Math.min(1, Math.max(0, value / max)) : 0;
  const offset = circumference * (1 - pct);

  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      {glow ? (
        <div
          aria-hidden="true"
          className="absolute inset-0 rounded-full"
          style={{
            background: `radial-gradient(closest-side, color-mix(in srgb, ${color} 38%, transparent), transparent)`,
            filter: "blur(14px)",
          }}
        />
      ) : null}
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="relative -rotate-90">
        <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke={trackColor} strokeWidth={strokeWidth} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 500ms ease", filter: glow ? `drop-shadow(0 0 6px color-mix(in srgb, ${color} 55%, transparent))` : undefined }}
        />
      </svg>
      {children ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
      ) : null}
    </div>
  );
}
