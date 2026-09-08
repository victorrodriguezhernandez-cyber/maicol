"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MealComposer, type DraftItem } from "@/components/register/MealComposer";
import { aiItemToDraft, type AiMealEstimateResponse } from "@/lib/nutrition/ai-estimate-to-item";
import { EmptyState } from "@/components/ui/EmptyState";

type State =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "result"; result: AiMealEstimateResponse }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

export default function TextoEntryPage() {
  const [text, setText] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function analyze() {
    if (!text.trim()) return;
    setState({ kind: "analyzing" });
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("analyze-text", { body: { text } });
    if (error) {
      setState({ kind: "error", message: error.message });
      return;
    }
    if (data?.error === "ai_unavailable") {
      setState({ kind: "unavailable" });
      return;
    }
    setState({ kind: "result", result: data as AiMealEstimateResponse });
  }

  if (state.kind === "result") {
    const draftItems: DraftItem[] = state.result.unable_to_estimate
      ? []
      : state.result.items.map((i) => aiItemToDraft(i, "ai_text_estimation"));
    return (
      <div className="flex flex-col gap-4">
        {state.result.unable_to_estimate ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4 text-sm text-[var(--text-primary)]">
            <p className="font-medium">No hemos podido interpretar bien esta descripción.</p>
            <ul className="mt-2 list-disc pl-4 text-xs text-[var(--text-secondary)]">
              {state.result.clarifying_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
          </div>
        ) : null}
        <MealComposer initialItems={draftItems} title="Revisar estimación" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Describe lo que has comido</h1>
      <textarea
        autoFocus
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        placeholder="He comido más o menos 180 gramos de pollo, unos 150 gramos de arroz, medio aguacate y una Coca-Cola Zero."
        className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
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
        className="rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        {state.kind === "analyzing" ? "Analizando…" : "Analizar"}
      </button>
    </div>
  );
}
