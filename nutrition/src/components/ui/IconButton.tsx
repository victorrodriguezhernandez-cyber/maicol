import type { ButtonHTMLAttributes } from "react";

type Variant = "ghost" | "soft" | "solid";

const VARIANT_CLASS: Record<Variant, string> = {
  ghost: "text-[var(--text-secondary)] active:bg-[var(--surface-2)]",
  soft: "bg-[var(--surface-2)] border border-[var(--border)] text-[var(--text-primary)]",
  solid: "btn-primary text-[var(--accent-fg)]",
};

/** A round icon-only tap target — header actions, sheet close buttons,
 * the composer's attach button. `size` controls the hit area (defaults
 * to 40px, the minimum comfortable tap target). */
export function IconButton({
  variant = "ghost",
  size = 40,
  className = "",
  children,
  ...props
}: {
  variant?: Variant;
  size?: number;
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      type="button"
      className={`tap-scale flex shrink-0 items-center justify-center rounded-full transition-colors ${VARIANT_CLASS[variant]} ${className}`}
      style={{ width: size, height: size }}
      {...props}
    >
      {children}
    </button>
  );
}
