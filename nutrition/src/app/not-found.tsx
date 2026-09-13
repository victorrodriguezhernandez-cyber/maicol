import Link from "next/link";

/**
 * Branded 404. Replaces Next's default `/_not-found` page, which shows
 * bare unstyled text — jarring inside an installed PWA, where there is no
 * browser chrome to explain where the user has landed.
 *
 * A Server Component on purpose: nothing here needs interactivity, and it
 * has to render for a route that never matched anything.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-5 px-6 text-center">
      <p className="font-numeric text-4xl font-semibold text-[var(--text-tertiary)]">404</p>
      <div className="flex flex-col gap-2">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Esta pantalla no existe</h1>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          Puede que el enlace sea antiguo o que el registro que buscabas se haya eliminado.
        </p>
      </div>
      <Link
        href="/"
        className="btn-primary tap-scale w-full max-w-xs rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
      >
        Volver a Hoy
      </Link>
    </div>
  );
}
