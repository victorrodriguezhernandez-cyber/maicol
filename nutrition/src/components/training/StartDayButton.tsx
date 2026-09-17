"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { startSession } from "@/lib/actions/training";
import Link from "next/link";
import { PlayIcon, PlusIcon } from "@/components/ui/icons";

/**
 * Qué entreno hay abierto ahora mismo, si hay alguno.
 *
 * `routineDayId` es el día de la rutina al que pertenece, o `null` si es
 * un entreno libre.
 */
export interface EntrenoAbierto {
  sessionId: string;
  routineDayId: string | null;
  title: string;
}

/**
 * "Empezar" un día de rutina, o un entreno libre.
 *
 * El botón dice "Continuar" SÓLO en el día que de verdad está abierto.
 * Antes decía "Continuar" en todos los días a la vez, porque recibía un
 * único booleano "hay algo abierto" sin mirar de qué día era, y detrás
 * hacía algo peor que el texto: `startSession` devolvía la sesión
 * abierta fuera del día que fuera, así que pulsar el día de pierna con
 * el de empuje a medias te metía en el de empuje sin avisar.
 *
 * Ahora cada caso hace lo que dice:
 * - el día abierto → "Continuar", y va directo a esa sesión;
 * - otro día con algo abierto → "Empezar" que no navega a ciegas: explica
 *   qué entreno tienes a medias y te enlaza a terminarlo;
 * - sin nada abierto → "Empezar" y abre el entreno.
 */
export function StartDayButton({
  routineDayId,
  dayName,
  emptyHref,
  variant = "primary",
  abierto = null,
}: {
  routineDayId: string | null;
  dayName: string;
  /**
   * A dónde llevar cuando el día todavía no tiene ejercicios.
   *
   * Antes esto era un `disabled` a secas, y era el peor botón de la app:
   * crear una rutina desde plantilla deja los días vacíos, así que lo
   * primero que veías al entrar era un "Empezar" que no hacía nada. Un
   * botón deshabilitado sólo vale cuando de verdad no hay nada que
   * hacer; aquí sí lo hay — falta añadir ejercicios — así que el botón
   * cambia de texto y te lleva allí.
   */
  emptyHref?: string | null;
  variant?: "primary" | "secondary";
  /** El entreno en curso, si hay uno. No tiene que ser de este día. */
  abierto?: EntrenoAbierto | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [conflicto, setConflicto] = useState<EntrenoAbierto | null>(null);

  // ¿Lo que está abierto es ESTE día? Comparar el id del día es lo único
  // que lo dice: dos días de la misma rutina pueden llamarse igual.
  const esEsteDia = abierto != null && abierto.routineDayId === routineDayId;
  const otroDiaAbierto = abierto != null && !esEsteDia ? abierto : null;

  function handleClick() {
    setError(null);
    setConflicto(null);

    // Ya sabemos desde el servidor que hay otro entreno a medias: no
    // llamamos a la acción para que nos lo vuelva a decir.
    if (otroDiaAbierto) {
      setConflicto(otroDiaAbierto);
      return;
    }

    startTransition(async () => {
      try {
        const resultado = await startSession({ routineDayId, title: dayName });
        if (!resultado.ok) {
          // Se abrió otro entreno entre que cargó la página y este toque.
          setConflicto({
            sessionId: resultado.abierta.sessionId,
            routineDayId: null,
            title: resultado.abierta.title,
          });
          return;
        }
        router.push(`/entreno/sesion/${resultado.sessionId}`);
      } catch (e) {
        setError(
          e instanceof Error && navigator.onLine
            ? e.message
            : "No se ha podido empezar el entreno. Comprueba la conexión.",
        );
      }
    });
  }

  // Día sin ejercicios: en vez de un botón apagado, la acción que de
  // verdad toca.
  if (emptyHref) {
    return (
      <Link href={emptyHref} className="btn-pill shrink-0 text-xs">
        <PlusIcon size={13} /> Añadir ejercicios
      </Link>
    );
  }

  if (variant === "secondary") {
    return (
      <div className="flex flex-col gap-1.5">
        <button
          type="button"
          onClick={handleClick}
          disabled={pending}
          className="btn-secondary tap-scale flex w-full items-center justify-center gap-2 rounded-xl py-3 text-sm font-semibold text-[var(--text-primary)]"
        >
          <PlayIcon size={15} />
          {pending ? "Abriendo…" : "Entreno libre"}
        </button>
        {conflicto ? <AvisoAbierto abierto={conflicto} /> : null}
        {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}
      </div>
    );
  }

  // El día que está abierto no necesita pasar por la acción: ya existe la
  // sesión, así que es un enlace y no un botón. Un enlace se puede abrir
  // en otra pestaña, se precarga y no depende de la red para responder.
  if (esEsteDia) {
    return (
      <Link
        href={`/entreno/sesion/${abierto.sessionId}`}
        className="btn-pill shrink-0 text-xs"
        data-active="true"
        aria-label={`Continuar ${dayName}`}
      >
        <PlayIcon size={13} /> Continuar
      </Link>
    );
  }

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={pending}
        aria-label={`Empezar ${dayName}`}
        className="btn-pill text-xs"
      >
        {pending ? "…" : "Empezar"}
      </button>
      {conflicto ? <AvisoAbierto abierto={conflicto} alineadoALaDerecha /> : null}
      {error ? (
        <p className="max-w-[9rem] text-right text-[10px] text-[var(--danger)]">{error}</p>
      ) : null}
    </div>
  );
}

/**
 * "Tienes otro a medias" con la salida incluida.
 *
 * Un aviso que dice que no puedes hacer algo y no dice qué hacer en su
 * lugar es un callejón sin salida, así que el nombre del entreno abierto
 * es el enlace para ir a terminarlo.
 */
function AvisoAbierto({
  abierto,
  alineadoALaDerecha = false,
}: {
  abierto: EntrenoAbierto;
  alineadoALaDerecha?: boolean;
}) {
  return (
    <p
      className={`text-[10px] leading-snug text-[var(--text-secondary)] ${
        alineadoALaDerecha ? "max-w-[10rem] text-right" : ""
      }`}
    >
      Tienes{" "}
      <Link
        href={`/entreno/sesion/${abierto.sessionId}`}
        className="font-semibold underline"
        style={{ color: "var(--accent-2)" }}
      >
        {abierto.title}
      </Link>{" "}
      a medias. Termínalo antes de empezar otro.
    </p>
  );
}
