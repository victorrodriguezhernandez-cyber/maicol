"use client";

import { useEffect, useState } from "react";
import { CloseIcon } from "@/components/ui/icons";

const DISMISS_KEY = "maicol-install-dismissed";

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

function isStandalone() {
  if (typeof window === "undefined") return false;
  return (
    window.matchMedia?.("(display-mode: standalone)").matches ||
    // iOS Safari's own flag — not in the DOM lib types.
    (window.navigator as Navigator & { standalone?: boolean }).standalone === true
  );
}

function isIos() {
  if (typeof navigator === "undefined") return false;
  return /iphone|ipad|ipod/i.test(navigator.userAgent);
}

/**
 * "No parece una web": Chrome/Android give us a real install prompt via
 * `beforeinstallprompt`, but iOS Safari never fires that event at all —
 * there, "installing" only exists as a manual Share ⇒ Añadir a pantalla
 * de inicio, which nothing on the page can trigger, so the best a PWA can
 * do is tell the user those steps. Once actually installed (opened from
 * the home-screen icon), `display: standalone` is already true and this
 * renders nothing — the whole point is to get there.
 */
type Mode = "hidden" | "ios" | "android";

export function InstallPrompt() {
  // One state object, one setState call per transition — whether this
  // is iOS (no beforeinstallprompt exists to wait for) or Android/Chrome
  // (has a real deferred prompt) can only be known client-side (UA
  // sniffing, localStorage, a browser event), never during SSR, so it's
  // read once after mount rather than derived during render.
  const [mode, setMode] = useState<Mode>("hidden");
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    if (isStandalone() || localStorage.getItem(DISMISS_KEY)) return;
    if (isIos()) {
      // Not deriving this from render/props — UA sniffing only exists
      // client-side, so it genuinely can't be known until after mount.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setMode("ios");
      return;
    }

    function onBeforeInstallPrompt(e: Event) {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setMode("android");
    }
    function onInstalled() {
      localStorage.setItem(DISMISS_KEY, "1");
      setMode("hidden");
    }
    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setMode("hidden");
  }

  async function install() {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setMode("hidden");
    if (outcome === "accepted") localStorage.setItem(DISMISS_KEY, "1");
  }

  if (mode === "hidden") return null;
  const ios = mode === "ios";

  return (
    <div className="surface-glass safe-x fixed inset-x-3 z-50 flex items-start gap-3 rounded-2xl p-3.5 shadow-[var(--shadow-lg)] top-[calc(env(safe-area-inset-top)+8px)]">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl btn-primary text-sm font-semibold">
        M
      </div>
      <div className="flex-1 text-xs text-[var(--text-secondary)]">
        <p className="text-sm font-semibold text-[var(--text-primary)]">Instala Maicol en tu móvil</p>
        {ios ? (
          <p className="mt-0.5">
            Pulsa <span className="font-medium text-[var(--text-primary)]">Compartir</span> y luego{" "}
            <span className="font-medium text-[var(--text-primary)]">Añadir a pantalla de inicio</span>. Se
            abrirá como una app, sin la barra del navegador.
          </p>
        ) : (
          <p className="mt-0.5">Ábrela como una app, sin la barra del navegador ni la URL.</p>
        )}
        {!ios ? (
          <button
            type="button"
            onClick={install}
            className="btn-primary tap-scale mt-2 rounded-full px-3.5 py-1.5 text-xs font-semibold"
          >
            Instalar
          </button>
        ) : null}
      </div>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Cerrar"
        className="tap-scale flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[var(--text-tertiary)]"
      >
        <CloseIcon size={13} />
      </button>
    </div>
  );
}
