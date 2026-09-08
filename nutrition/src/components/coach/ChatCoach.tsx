"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyGoalChange } from "@/lib/actions/goals";
import { formatKcal } from "@/lib/format";
import type { NutritionGoalRow } from "@/lib/supabase/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ProposedGoalChange {
  type: "goal_change";
  kcal?: number;
  protein_g?: number;
  carbohydrates_g?: number;
  fat_g?: number;
  reason?: string;
}

const SUGGESTED_PROMPTS = [
  "¿Cómo voy esta semana?",
  "¿Cuántas calorías llevo hoy?",
  "¿Qué me falta para llegar a mis macros?",
  "¿Estoy ganando peso demasiado rápido?",
];

export function ChatCoach({ currentGoal }: { currentGoal: NutritionGoalRow | null }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>(undefined);
  const [input, setInput] = useState("");
  const [proposedAction, setProposedAction] = useState<ProposedGoalChange | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isApplying, startApplying] = useTransition();

  function send(message: string) {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    setUnavailable(false);
    setErrorMessage(null);

    startTransition(async () => {
      const supabase = createClient();
      const { data, error } = await supabase.functions.invoke("ai-coach", {
        body: { conversationId, message },
      });
      // Only "ai_unavailable" means the GEMINI_API_KEY secret is actually
      // missing. Any other failure (network hiccup, a transient error from
      // Gemini, a bug) is a different problem and must say so honestly
      // instead of pointing the user at a config issue that isn't real.
      if (data?.error === "ai_unavailable") {
        setUnavailable(true);
        return;
      }
      if (error || data?.error) {
        setErrorMessage("Hubo un error al hablar con el Coach IA. Inténtalo de nuevo en unos segundos.");
        return;
      }
      setConversationId(data.conversationId);
      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }]);
      setProposedAction(data.proposedAction ?? null);
    });
  }

  function confirmProposal() {
    if (!proposedAction) return;
    startApplying(async () => {
      await applyGoalChange({
        kcal: proposedAction.kcal ?? currentGoal?.kcal ?? 2000,
        proteinG: proposedAction.protein_g ?? currentGoal?.protein_g ?? 0,
        carbohydratesG: proposedAction.carbohydrates_g ?? currentGoal?.carbohydrates_g ?? 0,
        fatG: proposedAction.fat_g ?? currentGoal?.fat_g ?? 0,
        fiberG: currentGoal?.fiber_g ?? null,
        source: "ai_suggestion",
      });
      setProposedAction(null);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-col gap-2">
        {messages.length === 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_PROMPTS.map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => send(p)}
                className="rounded-full border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
              >
                {p}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((m, i) => (
          <div
            key={i}
            className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
              m.role === "user"
                ? "ml-auto bg-[var(--accent)] text-[var(--accent-fg)]"
                : "bg-[var(--surface)] text-[var(--text-primary)]"
            }`}
          >
            {m.content}
          </div>
        ))}

        {isPending ? (
          <div className="max-w-[60%] rounded-2xl bg-[var(--surface)] px-3.5 py-2.5 text-sm text-[var(--text-secondary)]">
            …
          </div>
        ) : null}

        {unavailable ? (
          <p className="text-xs text-[var(--danger)]">
            El Coach IA no está disponible ahora mismo (falta configurar GEMINI_API_KEY).
          </p>
        ) : null}

        {errorMessage ? <p className="text-xs text-[var(--danger)]">{errorMessage}</p> : null}

        {proposedAction ? (
          <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--text-primary)]">
            <p className="font-medium">Confirmar modificación</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{proposedAction.reason}</p>
            {proposedAction.kcal ? (
              <p className="mt-1 text-xs">Nuevo objetivo: {formatKcal(proposedAction.kcal)}</p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={isApplying}
                onClick={confirmProposal}
                className="rounded-lg bg-[var(--accent)] px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)]"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setProposedAction(null)}
                className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs text-[var(--text-secondary)]"
              >
                Cancelar
              </button>
            </div>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="sticky bottom-[calc(env(safe-area-inset-bottom)+72px)] flex items-center gap-2 rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-1.5"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta algo sobre tus datos…"
          className="flex-1 bg-transparent px-2 py-1.5 text-sm text-[var(--text-primary)] outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isPending}
          className="rounded-xl bg-[var(--accent)] px-4 py-1.5 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
