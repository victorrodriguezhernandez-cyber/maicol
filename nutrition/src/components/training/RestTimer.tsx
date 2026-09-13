"use client";

import { useEffect, useRef, useState } from "react";
import { TimerIcon, CloseIcon, PlusIcon } from "@/components/ui/icons";

/**
 * El cronómetro de descanso.
 *
 * ── Por qué cuenta con un timestamp y no restando de un contador ───────
 *
 * Un `setInterval` que hace `segundos - 1` cada segundo se desincroniza
 * en cuanto el navegador estrangula los temporizadores, que es
 * exactamente lo que hace iOS cuando bloqueas la pantalla o cambias de
 * app — o sea, lo que cualquiera hace entre serie y serie. Al guardar el
 * instante en que acaba y comparar con el reloj en cada tick, el tiempo
 * que se ve al volver es el tiempo real que ha pasado.
 *
 * ── Por qué no suena ni vibra ──────────────────────────────────────────
 *
 * La vibración (`navigator.vibrate`) no existe en Safari de iOS, y el
 * audio automático está bloqueado si el usuario no ha interactuado. Una
 * alarma que falla la mitad de las veces es peor que no tenerla: te fías
 * de ella y se te pasa la serie. Lo que sí se hace es que el aviso sea
 * imposible de no ver — el contador se pone en rojo y crece al llegar a
 * cero.
 */
export function RestTimer({
  endsAt,
  label,
  onDismiss,
  onExtend,
}: {
  endsAt: number;
  label: string;
  onDismiss: () => void;
  onExtend: (seconds: number) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  const dismissTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    const interval = setInterval(tick, 250);
    // Al volver de segundo plano iOS no dispara el intervalo atrasado:
    // este listener recoloca el contador en cuanto la pestaña despierta.
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", tick);
    };
  }, []);

  const remaining = Math.ceil((endsAt - now) / 1000);
  const finished = remaining <= 0;

  // Cuando lleva 30 segundos pasado, se quita solo: dejarlo clavado en
  // "-2:14" ocupa sitio y ya no dice nada.
  useEffect(() => {
    if (remaining > -30) return;
    if (dismissTimeout.current) return;
    dismissTimeout.current = setTimeout(onDismiss, 0);
    return () => {
      if (dismissTimeout.current) clearTimeout(dismissTimeout.current);
      dismissTimeout.current = null;
    };
  }, [remaining, onDismiss]);

  const display = formatRemaining(Math.abs(remaining));

  return (
    <div
      className="safe-bottom pointer-events-auto fixed inset-x-0 bottom-[4.5rem] z-40 mx-auto w-[min(28rem,calc(100%-2rem))]"
      role="status"
      aria-live="polite"
    >
      <div
        className="surface-glass flex items-center gap-3 rounded-2xl px-4 py-3"
        style={{
          borderColor: finished
            ? "color-mix(in srgb, var(--danger) 50%, transparent)"
            : "color-mix(in srgb, var(--accent) 40%, transparent)",
          boxShadow: "var(--shadow-md)",
        }}
      >
        <TimerIcon
          size={20}
          style={{ color: finished ? "var(--danger)" : "var(--accent-2)" }}
        />
        <div className="flex min-w-0 flex-col">
          <span
            className="text-metric leading-none"
            style={{
              fontSize: finished ? "1.4rem" : "1.15rem",
              color: finished ? "var(--danger)" : "var(--text-primary)",
              transition: "font-size 200ms ease, color 200ms ease",
            }}
          >
            {finished ? `+${display}` : display}
          </span>
          <span className="truncate text-[11px] text-[var(--text-tertiary)]">
            {finished ? `Descanso cumplido · ${label}` : `Descansando · ${label}`}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onExtend(30)}
            className="btn-pill px-3 py-1.5 text-xs"
            aria-label="Añadir 30 segundos de descanso"
          >
            <PlusIcon size={12} /> 30s
          </button>
          <button
            type="button"
            onClick={onDismiss}
            aria-label="Saltar el descanso"
            className="tap-scale flex h-8 w-8 items-center justify-center rounded-full text-[var(--text-secondary)]"
            style={{ background: "var(--surface-2)" }}
          >
            <CloseIcon size={15} />
          </button>
        </div>
      </div>
    </div>
  );
}

function formatRemaining(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
