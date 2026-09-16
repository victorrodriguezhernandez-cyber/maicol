"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MealComposer, type DraftItem } from "@/components/register/MealComposer";
import { aiItemToDraft, type AiMealEstimateResponse } from "@/lib/nutrition/ai-estimate-to-item";
import { EmptyState } from "@/components/ui/EmptyState";
import { invokeAi, mensajeDeFallo } from "@/lib/ai/invoke";
import { useRegisterContext } from "@/lib/register-context";

type State =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "result"; result: AiMealEstimateResponse }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

export default function TextoEntryPage() {
  // `useRegisterContext` lee la URL, y eso obliga a un límite de Suspense.
  return (
    <Suspense fallback={null}>
      <TextoEntryInner />
    </Suspense>
  );
}

function TextoEntryInner() {
  const { mealType, date } = useRegisterContext();
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function analyze() {
    if (!text.trim()) return;
    setState({ kind: "analyzing" });
    const supabase = createClient();
    // `invokeAi` lee el cuerpo que devolvió la función. `invoke` a secas
    // no sirve: con cualquier respuesta que no sea 2xx deja `data` en null
    // y el motivo real encerrado en el error, así que la comprobación de
    // abajo no se cumplía nunca y todo salía como "error genérico".
    const { data, fallo } = await invokeAi<AiMealEstimateResponse>(supabase, "analyze-text", { text });
    if (fallo) {
      if (fallo.tipo === "sin_configurar") {
        setState({ kind: "unavailable" });
        return;
      }
      setState({ kind: "error", message: mensajeDeFallo(fallo) });
      return;
    }
    setState({ kind: "result", result: data! });
  }

  if (state.kind === "result") {
    const draftItems: DraftItem[] = state.result.unable_to_estimate
      ? []
      : state.result.items.map((i) => aiItemToDraft(i, "ai_text_estimation"));
    return (
      <div className="flex flex-col gap-4">
        {state.result.unable_to_estimate ? (
          <div className="surface-soft p-4 text-sm text-[var(--text-primary)]">
            <p className="font-semibold">No hemos podido interpretar bien esta descripción.</p>
            <ul className="mt-2 list-disc pl-4 text-xs text-[var(--text-secondary)]">
              {state.result.clarifying_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <MealComposer initialMealType={mealType} date={date} initialItems={draftItems} title="Revisar estimación" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-hero-title text-xl text-[var(--text-primary)]">Describe lo que has comido</h1>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="He comido más o menos 180 gramos de pollo, unos 150 gramos de arroz, medio aguacate y una Coca-Cola Zero."
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
      />

      {state.kind === "unavailable" ? (
        <EmptyState
          title="La IA no está disponible ahora mismo"
          action={
            <a href="/registrar/manual" className="text-sm font-medium text-[var(--accent)]">
              Introducir manualmente →
            </a>
          }
        />
      ) : null}
      {state.kind === "error" ? <p className="text-sm text-[var(--danger)]">{state.message}</p> : null}

      <button
        type="button"
        disabled={!text.trim() || state.kind === "analyzing"}
        onClick={analyze}
        className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-50"
      >
        {state.kind === "analyzing" ? "Analizando…" : "Analizar"}
      </button>
    </div>
  );
}
