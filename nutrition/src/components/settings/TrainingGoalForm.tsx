"use client";

import { useState, useTransition } from "react";
import { setTrainingGoal } from "@/lib/actions/training";
import {
  TRAINING_FOCUS,
  TRAINING_FOCUS_HINTS,
  TRAINING_FOCUS_LABELS,
  type TrainingFocus,
  type TrainingGoalRow,
} from "@/lib/training/types";
import { RANGO_POR_FOCO } from "@/lib/training/progression";

/**
 * Qué persigo entrenando.
 *
 * Se pueden marcar hasta tres porque "fuerza y volumen" es una respuesta
 * real, y EL ORDEN IMPORTA: el primero que marcas es el principal y es el
 * que decide el rango de repeticiones cuando dos pedirían cosas
 * distintas. Eso se dice en pantalla, no se deja adivinar.
 *
 * El campo libre existe porque ninguna lista de cinco opciones cubre
 * "quiero seguir subiendo en press sin que me duela el hombro". Va al
 * coach como contexto, y la pantalla dice exactamente eso para no
 * prometer que un algoritmo lo va a leer (regla 11).
 */
export function TrainingGoalForm({ goal }: { goal: TrainingGoalRow | null }) {
  const [focus, setFocus] = useState<TrainingFocus[]>(goal?.focus ?? []);
  const [notes, setNotes] = useState(goal?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [guardado, setGuardado] = useState(false);
  const [guardando, guardar] = useTransition();

  const principal = focus[0] ?? null;
  const rango = principal ? RANGO_POR_FOCO[principal] : null;

  function toggle(f: TrainingFocus) {
    setGuardado(false);
    setError(null);
    setFocus((actual) => {
      if (actual.includes(f)) return actual.filter((x) => x !== f);
      if (actual.length >= 3) return actual;
      // Se añade al final: el primero que marcaste sigue siendo el
      // principal, y así marcar uno más no te cambia el criterio.
      return [...actual, f];
    });
  }

  const sinCambios =
    focus.join(",") === (goal?.focus ?? []).join(",") && notes.trim() === (goal?.notes ?? "");

  function enviar() {
    if (focus.length === 0) {
      setError("Elige al menos un objetivo.");
      return;
    }
    guardar(async () => {
      try {
        await setTrainingGoal({ focus, notes: notes.trim() || null });
        setGuardado(true);
        setError(null);
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se ha podido guardar.");
      }
    });
  }

  return (
    <section className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {TRAINING_FOCUS.map((f) => {
          const i = focus.indexOf(f);
          const marcado = i >= 0;
          return (
            <button
              key={f}
              type="button"
              onClick={() => toggle(f)}
              aria-pressed={marcado}
              className="tap-scale flex items-center gap-3 rounded-xl px-3.5 py-3 text-left"
              style={{
                background: "var(--surface-2)",
                boxShadow: marcado ? "inset 0 0 0 1.5px var(--accent)" : "none",
              }}
            >
              <span
                className="text-metric flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                style={{
                  background: marcado ? "var(--accent)" : "transparent",
                  color: marcado ? "var(--accent-fg)" : "var(--text-tertiary)",
                  boxShadow: marcado ? "none" : "inset 0 0 0 1.5px var(--border-soft)",
                }}
              >
                {marcado ? i + 1 : ""}
              </span>
              <span className="min-w-0">
                <span className="block text-[14px] font-semibold text-[var(--text-primary)]">
                  {TRAINING_FOCUS_LABELS[f]}
                  {i === 0 ? (
                    <span className="ml-1.5 text-[11px] font-semibold text-[var(--accent)]">
                      principal
                    </span>
                  ) : null}
                </span>
                <span className="block text-[12px] text-[var(--text-tertiary)]">
                  {TRAINING_FOCUS_HINTS[f]}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {focus.length >= 3 ? (
        <p className="text-[11.5px] text-[var(--text-tertiary)]">
          Tres es el máximo. Para cambiar el principal, desmarca y vuelve a marcar en el orden que
          quieras.
        </p>
      ) : null}

      {rango ? (
        <p className="text-[12px] leading-relaxed text-[var(--text-secondary)]">
          {rango.nota} Es a lo que apuntan los entrenos sueltos, sin rutina detrás: cuando el
          ejercicio viene de una rutina manda lo que pauta la rutina.
        </p>
      ) : null}

      <label className="flex flex-col gap-1.5">
        <span className="text-section">Cuéntalo con tus palabras</span>
        <textarea
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setGuardado(false);
          }}
          maxLength={1000}
          rows={3}
          placeholder="Quiero seguir subiendo en press sin que me moleste el hombro, y llegar al verano más definido."
          className="input-field resize-none"
        />
        <span className="text-[11.5px] text-[var(--text-tertiary)]">
          Esto se lo paso al coach cuando le preguntes, para que responda sabiendo a qué vas. No lo
          lee ningún cálculo automático.
        </span>
      </label>

      {error ? <p className="text-sm text-[var(--danger)]">{error}</p> : null}

      <button
        type="button"
        onClick={enviar}
        disabled={guardando || sinCambios}
        className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-40"
      >
        {guardando ? "Guardando…" : guardado && sinCambios ? "Guardado" : "Guardar objetivo"}
      </button>

      {goal ? (
        <p className="text-[11.5px] text-[var(--text-tertiary)]">
          El objetivo que tienes ahora lo pusiste el {goal.effective_from}. Al cambiarlo no se pisa:
          se cierra y empieza uno nuevo, para poder mirar atrás y ver con qué objetivo entrenabas en
          cada momento.
        </p>
      ) : null}
    </section>
  );
}
