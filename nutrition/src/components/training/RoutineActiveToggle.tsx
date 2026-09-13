"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { setActiveRoutine } from "@/lib/actions/training";
import { CheckIcon } from "@/components/ui/icons";

/**
 * Marca una rutina como la activa.
 *
 * Sólo puede haber una — lo garantiza un índice único en la base de
 * datos, no sólo esta pantalla — y es la que aparece en Entreno al abrir
 * la app. Por eso el botón activo no se puede "desactivar": quedarse sin
 * ninguna rutina activa no es un estado que el usuario quiera, sólo uno
 * al que se llega sin querer.
 */
export function RoutineActiveToggle({
  routineId,
  isActive,
}: {
  routineId: string;
  isActive: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  if (isActive) {
    return (
      <span
        className="flex items-center justify-center gap-1.5 rounded-xl py-2 text-xs font-semibold"
        style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}
      >
        <CheckIcon size={13} /> Rutina activa
      </span>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() =>
          startTransition(async () => {
            setError(null);
            try {
              await setActiveRoutine(routineId);
              router.refresh();
            } catch {
              setError("No se ha podido activar. Comprueba la conexión.");
            }
          })
        }
        className="btn-secondary tap-scale rounded-xl py-2 text-xs font-semibold text-[var(--text-primary)]"
      >
        {pending ? "Activando…" : "Usar esta rutina"}
      </button>
      {error ? <p className="text-[11px] text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
