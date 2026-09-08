"use client";

/**
 * Offline fallback document — `@ducanh2912/next-pwa` auto-detects this
 * exact path (`app/~offline/page.tsx`) and precaches it as the page the
 * service worker serves when a navigation fetch fails with no network at
 * all. Before this existed, every page in the app is a Server Component
 * that does a live `supabase.auth.getUser()` before rendering anything —
 * with no connectivity that request just fails, and with no fallback
 * registered the browser/PWA shows nothing (the "pantalla negra" this
 * fixes). This page must never do its own auth check or data fetch: it
 * has to render standalone, purely from what the service worker already
 * cached, however it was reached.
 */
export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 bg-[var(--app-bg)] px-6 text-center pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex h-14 w-14 items-center justify-center rounded-2xl btn-primary text-xl font-semibold">
        M
      </div>

      <div className="flex flex-col gap-1.5">
        <h1 className="text-lg font-semibold text-[var(--text-primary)]">Sin conexión</h1>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          No hay internet ahora mismo, así que no se pueden cargar tus datos.
        </p>
      </div>

      <div className="glass-panel w-full max-w-xs rounded-2xl p-4 text-left text-xs text-[var(--text-secondary)]">
        <p>
          Si ya estabas registrando una comida a mano, guardarla funciona
          igual: se queda en este móvil y se sincroniza sola en cuanto
          vuelva la conexión, sin que tengas que repetirla.
        </p>
      </div>

      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-xl btn-primary px-5 py-2.5 text-sm font-medium"
      >
        Reintentar
      </button>
    </main>
  );
}
