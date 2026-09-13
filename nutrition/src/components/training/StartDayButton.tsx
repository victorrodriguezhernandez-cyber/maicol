"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startSession } from "@/lib/actions/training";
import { PlayIcon } from "@/components/ui/icons";

/**
 * "Empezar" un día de rutina, o un entreno libre.
 *
 * Si ya hay una sesión abierta, la Server Action devuelve esa misma en
 * vez de fallar (ver `startSession`), así que el botón lleva a donde toca
 * pase lo que pase. Aun así el texto cambia a "Continuar" cuando hay una
 * abierta: prometer "empezar" y aterrizar en el entreno de ayer a medias
 * sería mentir sobre lo que va a ocurrir.
 */
export function StartDayButton({
  routineDayId,
  dayName,
  disabled = false,
  variant = "primary",
  hasOpenSession = false,
}: {
  routineDayId: string | null;
  dayName: string;
  disabled?: boolean;
  variant?: "primary" | "secondary";
  hasOpenSession?: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        const { sessionId } = await startSession({
          routineDayId,
          title: dayName,
        });
        router.push(`/entreno/sesion/${sessionId}`);
      } catch (e) {
        setError(
          e instanceof Error && navigator.onLine
            ? e.message
            : "No se ha podido empezar el entreno. Comprueba la conexión.",
        );
      }
    });
  }

  const label = hasOpenSession ? "Continuar" : "Empezar";

  if (variant === "secondary") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={disabled || pending}
          className="btn-secondary tap-scale flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[var(--text-primary)]"
        >
          <PlayIcon size={15} />
          {pending ? "Abriendo…" : "Entreno libre"}
        </button>
        {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      </div>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={disabled || pending}
        aria-label={`${label} ${dayName}`}
        className="btn-pill text-xs"
        data-active={hasOpenSession ? "true" : undefined}
      >
        {pending ? "…" : label}
      </button>
      {error ? <p className="max-w-[9rem] text-right text-[10px] text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
