"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSession } from "@/lib/actions/training";
import { TrashIcon } from "@/components/ui/icons";

/**
 * Borrar un entreno ya guardado.
 *
 * Pide confirmación porque se lleva por delante las series, y con ellas
 * el volumen de esa semana y cualquier récord que saliera de ahí. No hay
 * papelera: si algún día la hay, esto se cambia por ella.
 */
export function DeleteSessionButton({ sessionId }: { sessionId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-center gap-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (
            !confirm(
              "¿Borrar este entreno? Se pierden sus series, y con ellas el volumen de esa semana y los récords que salieran de aquí.",
            )
          )
            return;
          startTransition(async () => {
            try {
              await deleteSession(sessionId);
              router.push("/entreno");
              router.refresh();
            } catch {
              setError("No se ha podido borrar el entreno.");
            }
          });
        }}
        className="flex items-center gap-1.5 text-xs font-medium text-[var(--text-tertiary)]"
      >
        <TrashIcon size={13} />
        {pending ? "Borrando…" : "Borrar este entreno"}
      </button>
      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
    </div>
  );
}
