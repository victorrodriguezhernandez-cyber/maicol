"use client";

import { useState, useTransition } from "react";
import { createClient } from "@/lib/supabase/client";
import { applyGoalChange } from "@/lib/actions/goals";
import {
  createMeal,
  deleteMeal,
  deleteMealItem,
  addMealItemForDate,
  type CreateMealInput,
  type AddMealItemForDateInput,
} from "@/lib/actions/meals";
import { setWeightEntryForDate, deleteWeightEntry } from "@/lib/actions/weight";
import { formatKcal } from "@/lib/format";
import type { NutritionGoalRow } from "@/lib/supabase/types";

interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

// Mirrors the `ActionProposal` shape returned by the ai-coach Edge Function
// (supabase/functions/ai-coach/index.ts) — kept as a loose Record for the
// payload since each kind below casts it to what it actually needs; the
// real validation happens server-side in the Server Action being called,
// same as any other write in this app.
interface ActionProposal {
  kind: "add_meal_item" | "update_weight_entry" | "delete_meal" | "duplicate_meal" | "goal_change";
  risk: "safe" | "destructive";
  summary: string;
  payload: Record<string, unknown>;
}

interface ExecutedAction {
  summary: string;
  undo?: () => Promise<void>;
}

interface ConversationSummary {
  id: string;
  title: string | null;
  updated_at: string;
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
  const [proposedAction, setProposedAction] = useState<ActionProposal | null>(null);
  const [lastExecuted, setLastExecuted] = useState<ExecutedAction | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [isApplying, startApplying] = useTransition();
  const [isUndoing, startUndoing] = useTransition();
  const [historyOpen, setHistoryOpen] = useState(false);
  const [conversations, setConversations] = useState<ConversationSummary[]>([]);
  const [isLoadingHistory, startLoadingHistory] = useTransition();

  function resetTurnState() {
    setUnavailable(false);
    setErrorMessage(null);
    setProposedAction(null);
    setLastExecuted(null);
  }

  function send(message: string) {
    if (!message.trim()) return;
    setMessages((prev) => [...prev, { role: "user", content: message }]);
    setInput("");
    resetTurnState();

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

      const action = data.action as ActionProposal | null;
      if (!action) return;
      if (action.risk === "safe") {
        await executeAction(action);
      } else {
        setProposedAction(action);
      }
    });
  }

  /** Runs a proposed action for real via the same Server Actions the rest
   * of the app uses (never a direct write from here), then records how to
   * undo it. Called immediately for "safe" actions, or on user confirmation
   * for "destructive" ones. */
  async function executeAction(action: ActionProposal) {
    switch (action.kind) {
      case "add_meal_item": {
        const payload = action.payload as AddMealItemForDateInput;
        const result = await addMealItemForDate(payload);
        setLastExecuted({
          summary: action.summary,
          undo: async () => {
            if (result.mealCreated) await deleteMeal(result.mealId);
            else await deleteMealItem(result.mealItemId);
          },
        });
        return;
      }
      case "update_weight_entry": {
        const payload = action.payload as { date: string; weightKg: number };
        const result = await setWeightEntryForDate(payload);
        setLastExecuted({
          summary: action.summary,
          undo: async () => {
            if (result.created) await deleteWeightEntry(result.id);
            else await setWeightEntryForDate({ date: payload.date, weightKg: result.previousWeightKg! });
          },
        });
        return;
      }
      case "duplicate_meal": {
        const payload = action.payload as { snapshot: CreateMealInput };
        const newMealId = await createMeal(payload.snapshot);
        setLastExecuted({
          summary: action.summary,
          undo: async () => {
            await deleteMeal(newMealId);
          },
        });
        return;
      }
      case "delete_meal": {
        const payload = action.payload as { mealId: string; snapshot: CreateMealInput };
        await deleteMeal(payload.mealId);
        setLastExecuted({
          summary: action.summary,
          undo: async () => {
            await createMeal(payload.snapshot);
          },
        });
        return;
      }
      case "goal_change": {
        const payload = action.payload as {
          kcal?: number;
          proteinG?: number;
          carbohydratesG?: number;
          fatG?: number;
        };
        const previous = currentGoal;
        await applyGoalChange({
          kcal: payload.kcal ?? currentGoal?.kcal ?? 2000,
          proteinG: payload.proteinG ?? currentGoal?.protein_g ?? 0,
          carbohydratesG: payload.carbohydratesG ?? currentGoal?.carbohydrates_g ?? 0,
          fatG: payload.fatG ?? currentGoal?.fat_g ?? 0,
          fiberG: currentGoal?.fiber_g ?? null,
          source: "ai_suggestion",
        });
        setLastExecuted({
          summary: action.summary,
          undo: previous
            ? async () =>
                await applyGoalChange({
                  kcal: previous.kcal,
                  proteinG: previous.protein_g,
                  carbohydratesG: previous.carbohydrates_g,
                  fatG: previous.fat_g,
                  fiberG: previous.fiber_g,
                  source: "manual",
                })
            : undefined,
        });
        return;
      }
    }
  }

  function confirmProposal() {
    if (!proposedAction) return;
    startApplying(async () => {
      await executeAction(proposedAction);
      setProposedAction(null);
    });
  }

  function undoLastAction() {
    if (!lastExecuted?.undo) return;
    startUndoing(async () => {
      await lastExecuted.undo!();
      setLastExecuted(null);
    });
  }

  function startNewChat() {
    setConversationId(undefined);
    setMessages([]);
    resetTurnState();
    setHistoryOpen(false);
  }

  function openHistory() {
    setHistoryOpen((open) => !open);
    if (historyOpen) return; // was open, just closing it
    startLoadingHistory(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("ai_conversations")
        .select("id, title, updated_at")
        .order("updated_at", { ascending: false })
        .limit(30);
      setConversations((data as ConversationSummary[] | null) ?? []);
    });
  }

  function openConversation(id: string) {
    setHistoryOpen(false);
    startTransition(async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("ai_messages")
        .select("role, content")
        .eq("conversation_id", id)
        .order("created_at", { ascending: true });
      setMessages(
        (data ?? [])
          .filter((m) => m.role === "user" || m.role === "assistant")
          .map((m) => ({ role: m.role as "user" | "assistant", content: m.content ?? "" })),
      );
      setConversationId(id);
      resetTurnState();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={openHistory}
          className="flex items-center gap-1 text-xs font-medium text-[var(--text-secondary)] transition-opacity duration-150 active:opacity-60"
        >
          <HistoryIcon />
          Chats
        </button>
        <button
          type="button"
          onClick={startNewChat}
          className="text-xs font-medium text-[var(--accent)] transition-opacity duration-150 active:opacity-60"
        >
          + Nuevo chat
        </button>
      </div>

      {historyOpen ? (
        <div className="glass-panel flex max-h-56 flex-col gap-0.5 overflow-y-auto rounded-2xl p-1.5">
          {isLoadingHistory ? (
            <p className="p-2 text-xs text-[var(--text-tertiary)]">Cargando…</p>
          ) : conversations.length === 0 ? (
            <p className="p-2 text-xs text-[var(--text-tertiary)]">Todavía no hay conversaciones guardadas.</p>
          ) : (
            conversations.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => openConversation(c.id)}
                className={`tap-row rounded-xl px-3 py-2 text-left text-sm ${
                  c.id === conversationId ? "bg-[var(--surface-raised)] font-medium" : ""
                } text-[var(--text-primary)]`}
              >
                <p className="truncate">{c.title || "Conversación sin título"}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {new Date(c.updated_at).toLocaleString("es-ES", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                </p>
              </button>
            ))
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="flex flex-col items-center gap-4 py-8 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full btn-primary">
              <SparkleIcon />
            </span>
            <div>
              <p className="text-sm font-semibold text-[var(--text-primary)]">
                Pregúntame lo que quieras
              </p>
              <p className="mx-auto mt-1 max-w-[260px] text-xs text-[var(--text-secondary)]">
                Leo tus datos reales de nutrición y peso, y puedo registrar o
                corregir cosas por ti cuando lo pidas.
              </p>
            </div>
            <div className="flex flex-wrap justify-center gap-1.5">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="rounded-full btn-secondary px-3 py-1.5 text-xs text-[var(--text-secondary)]"
                >
                  {p}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {messages.map((m, i) =>
          m.role === "user" ? (
            <div
              key={i}
              className="ml-auto max-w-[85%] rounded-2xl rounded-br-md btn-primary px-3.5 py-2.5 text-sm text-[var(--accent-fg)]"
            >
              {m.content}
            </div>
          ) : (
            <div key={i} className="flex max-w-[90%] items-start gap-2">
              <CoachAvatar />
              <div className="glass-panel rounded-2xl rounded-tl-md px-3.5 py-2.5 text-sm text-[var(--text-primary)]">
                {formatCoachText(m.content)}
              </div>
            </div>
          ),
        )}

        {isPending ? (
          <div className="flex items-center gap-2">
            <CoachAvatar />
            <div className="glass-panel flex gap-1 rounded-2xl rounded-tl-md px-3.5 py-3">
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-tertiary)] [animation-delay:-0.2s]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-tertiary)]" />
              <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-[var(--text-tertiary)] [animation-delay:0.2s]" />
            </div>
          </div>
        ) : null}

        {unavailable ? (
          <p className="text-xs text-[var(--danger)]">
            El Coach IA no está disponible ahora mismo (falta configurar GEMINI_API_KEY).
          </p>
        ) : null}

        {errorMessage ? <p className="text-xs text-[var(--danger)]">{errorMessage}</p> : null}

        {lastExecuted ? (
          <div className="flex items-center justify-between rounded-2xl bg-[var(--accent-soft)] px-3.5 py-2.5 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)] backdrop-blur-xl">
            <span>✅ {lastExecuted.summary}</span>
            {lastExecuted.undo ? (
              <button
                type="button"
                disabled={isUndoing}
                onClick={undoLastAction}
                className="ml-2 shrink-0 text-xs font-medium text-[var(--accent)] disabled:opacity-50"
              >
                {isUndoing ? "…" : "Deshacer"}
              </button>
            ) : null}
          </div>
        ) : null}

        {proposedAction ? (
          <div className="rounded-2xl border border-[var(--accent)] bg-[var(--accent-soft)] p-3 text-sm text-[var(--text-primary)] shadow-[var(--shadow-sm)] backdrop-blur-xl">
            <p className="font-medium">Confirmar acción</p>
            <p className="mt-1 text-xs text-[var(--text-secondary)]">{proposedAction.summary}</p>
            {proposedAction.kind === "goal_change" && (proposedAction.payload as { kcal?: number }).kcal ? (
              <p className="mt-1 text-xs">
                Nuevo objetivo: {formatKcal((proposedAction.payload as { kcal: number }).kcal)}
              </p>
            ) : null}
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                disabled={isApplying}
                onClick={confirmProposal}
                className="rounded-lg btn-primary px-3 py-1.5 text-xs font-medium text-[var(--accent-fg)]"
              >
                Confirmar
              </button>
              <button
                type="button"
                onClick={() => setProposedAction(null)}
                className="rounded-lg btn-secondary px-3 py-1.5 text-xs text-[var(--text-secondary)]"
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
        className="glass-panel sticky bottom-[calc(env(safe-area-inset-bottom)+72px)] flex items-center gap-1.5 rounded-full p-1.5 shadow-[var(--shadow-md)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta algo o pídeme que registre/cambie algo…"
          className="flex-1 bg-transparent px-3 py-2 text-sm text-[var(--text-primary)] outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isPending}
          className="flex h-9 w-9 items-center justify-center rounded-full btn-primary text-[var(--accent-fg)] disabled:opacity-40"
          aria-label="Enviar"
        >
          <SendIcon />
        </button>
      </form>
    </div>
  );
}

function CoachAvatar() {
  return (
    <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-[var(--accent-soft)] text-[var(--accent)]">
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none">
        <path
          d="M12 3.5c.4 2.6 1 4.1 2 5.1s2.5 1.6 5.1 2c-2.6.4-4.1 1-5.1 2s-1.6 2.5-2 5.1c-.4-2.6-1-4.1-2-5.1s-2.5-1.6-5.1-2c2.6-.4 4.1-1 5.1-2s1.6-2.5 2-5.1Z"
          stroke="currentColor"
          strokeWidth="1.6"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

function SparkleIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 3.5c.4 2.6 1 4.1 2 5.1s2.5 1.6 5.1 2c-2.6.4-4.1 1-5.1 2s-1.6 2.5-2 5.1c-.4-2.6-1-4.1-2-5.1s-2.5-1.6-5.1-2c2.6-.4 4.1-1 5.1-2s1.6-2.5 2-5.1Z"
        stroke="var(--accent-fg)"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
      <path d="M4 12l16-7-6 7 6 7-16-7Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
      <path d="M12 8v5l3 2" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M4.5 9A7.5 7.5 0 1 1 5 14.5"
        stroke="currentColor"
        strokeWidth="1.7"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 5.5V9h3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// The coach's replies are plain text from Gemini, which reliably uses
// markdown-style "**bold**" and "* " bullets even though we never asked for
// markdown output. Rendered as a single unbroken string these come out as
// literal asterisks with no line breaks — parse just enough of it (bold
// spans, bullet lines, blank-line paragraphs) to read naturally, without
// pulling in a full markdown renderer for a chat bubble.
function formatCoachText(text: string) {
  return text.split("\n").map((line, i) => {
    const trimmed = line.trim();
    const isBullet = trimmed.startsWith("* ") || trimmed.startsWith("- ");
    if (trimmed === "") return <p key={i} className="h-2" aria-hidden="true" />;
    return (
      <p key={i} className={isBullet ? "pl-3" : undefined}>
        {isBullet ? "• " : null}
        {renderBoldSpans(isBullet ? trimmed.slice(2) : line)}
      </p>
    );
  });
}

function renderBoldSpans(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, i) =>
    part.startsWith("**") && part.endsWith("**") ? (
      <strong key={i}>{part.slice(2, -2)}</strong>
    ) : (
      part
    ),
  );
}
