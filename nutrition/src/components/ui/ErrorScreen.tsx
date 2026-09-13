"use client";

import { AlertIcon } from "@/components/ui/icons";

/**
 * The single error fallback used by every error boundary in the app
 * (`(app)/error.tsx`, `registrar/error.tsx`, `global-error.tsx`).
 *
 * Two deliberate choices:
 *
 * - It never renders `error.message`. In production Next.js already
 *   replaces server-thrown messages with a generic one precisely so
 *   internals don't leak to the client; showing the raw message would
 *   only ever expose something in the cases where it *is* the real
 *   internal text. What it does show is `error.digest`, the hash that
 *   matches the corresponding server log — useful to report, useless to
 *   an attacker.
 * - "Reintentar" calls Next's `retry()`, which re-renders the failed
 *   segment rather than reloading the whole app, so a transient failure
 *   (a dropped connection mid-navigation) recovers in place.
 */
export function ErrorScreen({
  title = "Algo ha fallado",
  description = "No hemos podido cargar esta pantalla. Suele ser un problema temporal de conexión.",
  digest,
  onRetry,
  secondaryHref = "/",
  secondaryLabel = "Volver a Hoy",
}: {
  title?: string;
  description?: string;
  digest?: string;
  onRetry?: () => void;
  secondaryHref?: string;
  secondaryLabel?: string;
}) {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <span
        className="flex h-14 w-14 items-center justify-center rounded-full"
        style={{ background: "var(--danger-soft, rgba(220,38,38,0.12))", color: "var(--danger)" }}
      >
        <AlertIcon size={24} />
      </span>

      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-[var(--text-primary)]">{title}</h2>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">{description}</p>
      </div>

      <div className="flex w-full max-w-xs flex-col gap-2">
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            className="btn-primary tap-scale w-full rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
          >
            Reintentar
          </button>
        ) : null}
        <a
          href={secondaryHref}
          className="btn-secondary tap-scale w-full rounded-xl py-3 text-center text-sm font-semibold text-[var(--text-primary)]"
        >
          {secondaryLabel}
        </a>
      </div>

      {digest ? (
        <p className="font-numeric text-[11px] text-[var(--text-tertiary)]">
          Código del error: {digest}
        </p>
      ) : null}
    </div>
  );
}
