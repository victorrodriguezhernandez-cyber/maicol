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
import { formatKcal, formatDateTimeShort, MEAL_TYPE_LABELS } from "@/lib/format";
import type { NutritionGoalRow } from "@/lib/supabase/types";
import { LogoMark } from "@/components/ui/Logo";
import {
  HistoryIcon,
  SendIcon,
  CheckCircleIcon,
  UndoIcon,
  CloseIcon,
  SparkleIcon,
} from "@/components/ui/icons";

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

interface MealBreakdown {
  mealTypeLabel: string;
  totalKcal: number;
  items: { name: string; kcal: number }[];
  mealId: string;
}

interface ExecutedAction {
  summary: string;
  undo?: () => Promise<void>;
  /** Only set for actions that touched a whole meal (add_meal_item,
   * duplicate_meal) — real rows read back from the DB (or, for a
   * duplicate, the exact snapshot just written), never reconstructed
   * from the model's prose. Lets the "done" card show the actual meal
   * breakdown instead of just a one-line summary. */
  breakdown?: MealBreakdown | null;
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
        const breakdown = await fetchMealBreakdown(result.mealId);
        setLastExecuted({
          summary: action.summary,
          breakdown,
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
        // The snapshot already carries every item that was written — no
        // extra read needed, this is the exact data just inserted.
        const totalKcal = payload.snapshot.items.reduce((a, it) => a + it.energyKcal, 0);
        setLastExecuted({
          summary: action.summary,
          breakdown: {
            mealId: newMealId,
            mealTypeLabel: MEAL_TYPE_LABELS[payload.snapshot.mealType] ?? payload.snapshot.mealType,
            totalKcal,
            items: payload.snapshot.items.map((it) => ({ name: it.name, kcal: it.energyKcal })),
          },
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

  /** Reads back the meal's actual current items — used right after
   * add_meal_item so the "done" card can show the real, current
   * breakdown of that meal (which may include items logged before this
   * turn), never just the one item the model added. */
  async function fetchMealBreakdown(mealId: string): Promise<MealBreakdown | null> {
    const supabase = createClient();
    const { data } = await supabase
      .from("meals")
      .select("id, meal_type, meal_items(name, energy_kcal)")
      .eq("id", mealId)
      .maybeSingle();
    if (!data) return null;
    const items = (data.meal_items as { name: string; energy_kcal: number }[]) ?? [];
    return {
      mealId,
      mealTypeLabel: MEAL_TYPE_LABELS[data.meal_type as string] ?? (data.meal_type as string),
      totalKcal: items.reduce((a, it) => a + it.energy_kcal, 0),
      items: items.map((it) => ({ name: it.name, kcal: it.energy_kcal })),
    };
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
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={openHistory}
          className="tap-scale flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]"
        >
          <HistoryIcon size={14} />
          Chats
        </button>
        <button
          type="button"
          onClick={startNewChat}
          className="tap-scale text-xs font-semibold text-[var(--accent)]"
        >
          + Nuevo chat
        </button>
      </div>

      {historyOpen ? (
        <div className="surface-raised flex max-h-56 flex-col gap-0.5 overflow-y-auto p-1.5">
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
                  c.id === conversationId ? "bg-[var(--surface-2)] font-semibold" : ""
                } text-[var(--text-primary)]`}
              >
                <p className="truncate">{c.title || "Conversación sin título"}</p>
                <p className="text-[11px] text-[var(--text-tertiary)]">
                  {formatDateTimeShort(c.updated_at)}
                </p>
              </button>
            ))
          )}
        </div>
      ) : null}

      <div className="flex flex-col gap-3">
        {messages.length === 0 ? (
          <div className="surface-hero flex flex-col gap-3 p-4">
            <div className="flex items-center gap-3">
              <span
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full"
                style={{ background: "var(--accent-soft)" }}
              >
                <LogoMark size={19} />
              </span>
              <div>
                <p className="text-[14px] font-semibold text-[var(--text-primary)]">Pregúntame lo que quieras</p>
                <p className="text-xs text-[var(--text-tertiary)]">Conozco tus datos reales, no invento nada.</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <Capability label="Consulta tus macros" />
              <Capability label="Registra comidas" />
              <Capability label="Corrige un peso" />
              <Capability label="Ajusta tu objetivo" />
            </div>
            <div className="flex flex-wrap gap-1.5 border-t border-[var(--border-soft)] pt-3">
              {SUGGESTED_PROMPTS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => send(p)}
                  className="btn-secondary tap-scale rounded-full px-3 py-1.5 text-xs font-medium"
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
              className="btn-primary ml-auto max-w-[85%] rounded-2xl rounded-br-md px-4 py-2.5 text-sm text-[var(--accent-fg)]"
            >
              {m.content}
            </div>
          ) : (
            <div key={i} className="flex max-w-[90%] items-start gap-2">
              <CoachAvatar />
              <div className="surface-panel rounded-tl-md px-4 py-2.5 text-sm text-[var(--text-primary)]">
                {formatCoachText(m.content)}
              </div>
            </div>
          ),
        )}

        {isPending ? (
          <div className="flex items-center gap-2">
            <CoachAvatar />
            <div className="surface-panel flex gap-1 rounded-tl-md px-4 py-3.5">
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
          <div className="flex max-w-[92%] items-start gap-2">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--success) 18%, transparent)", color: "var(--success)" }}
            >
              <CheckCircleIcon size={13} />
            </span>
            <div className="surface-panel min-w-0 flex-1 rounded-tl-md p-3.5">
              <p className="text-[13px] font-medium text-[var(--text-primary)]">{lastExecuted.summary}</p>

              {lastExecuted.breakdown ? (
                <div className="mt-2.5 rounded-xl bg-[var(--surface)] p-3">
                  <div className="flex items-center justify-between border-b border-[var(--border-soft)] pb-2">
                    <span className="text-[11px] font-semibold uppercase tracking-[0.06em] text-[var(--text-secondary)]">
                      {lastExecuted.breakdown.mealTypeLabel}
                    </span>
                    <span className="text-metric text-sm text-[var(--text-primary)]">
                      {formatKcal(lastExecuted.breakdown.totalKcal)}
                    </span>
                  </div>
                  <ul className="flex flex-col divide-y divide-[var(--border-soft)]">
                    {lastExecuted.breakdown.items.map((it, i) => (
                      <li key={i} className="flex items-center justify-between py-1.5 text-xs">
                        <span className="text-[var(--text-secondary)]">{it.name}</span>
                        <span className="text-metric text-[var(--text-tertiary)]">{formatKcal(it.kcal)}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <div className="mt-2.5 flex items-center gap-3">
                {lastExecuted.breakdown ? (
                  <a
                    href={`/diario/comida/${lastExecuted.breakdown.mealId}`}
                    className="text-xs font-semibold text-[var(--accent)]"
                  >
                    Ver comida
                  </a>
                ) : null}
                {lastExecuted.undo ? (
                  <button
                    type="button"
                    disabled={isUndoing}
                    onClick={undoLastAction}
                    className="tap-scale flex items-center gap-1 text-xs font-semibold text-[var(--text-tertiary)] disabled:opacity-50"
                  >
                    <UndoIcon size={12} /> {isUndoing ? "…" : "Deshacer"}
                  </button>
                ) : null}
              </div>
            </div>
          </div>
        ) : null}

        {proposedAction ? (
          <div className="flex max-w-[92%] items-start gap-2">
            <span
              className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
              style={{ background: "color-mix(in srgb, var(--warning) 18%, transparent)", color: "var(--warning)" }}
            >
              <SparkleIcon size={12} />
            </span>
            <div className="surface-panel min-w-0 flex-1 rounded-tl-md p-3.5">
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">Confirmar acción</p>
              <p className="mt-1 text-xs text-[var(--text-secondary)]">{proposedAction.summary}</p>
              {proposedAction.kind === "goal_change" && (proposedAction.payload as { kcal?: number }).kcal ? (
                <p className="text-metric mt-2 flex items-center gap-2 text-sm text-[var(--text-primary)]">
                  {formatKcal(currentGoal?.kcal ?? 0)}
                  <span className="text-[var(--text-tertiary)]">→</span>
                  <span style={{ color: "var(--accent)" }}>
                    {formatKcal((proposedAction.payload as { kcal: number }).kcal)}
                  </span>
                </p>
              ) : null}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  disabled={isApplying}
                  onClick={confirmProposal}
                  className="btn-primary tap-scale rounded-lg px-3.5 py-1.5 text-xs font-semibold text-[var(--accent-fg)] disabled:opacity-50"
                >
                  Confirmar
                </button>
                <button
                  type="button"
                  onClick={() => setProposedAction(null)}
                  className="btn-ghost tap-scale flex items-center gap-1 rounded-lg px-3.5 py-1.5 text-xs font-semibold"
                >
                  <CloseIcon size={13} /> Cancelar
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          send(input);
        }}
        className="surface-glass sticky bottom-[calc(env(safe-area-inset-bottom)+72px)] flex items-center gap-1.5 rounded-full p-1.5 shadow-[var(--shadow-md)]"
      >
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Pregunta o pídeme algo…"
          className="flex-1 bg-transparent px-3.5 py-2 text-sm text-[var(--text-primary)] outline-none"
        />
        <button
          type="submit"
          disabled={!input.trim() || isPending}
          className="btn-primary tap-scale flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--accent-fg)] disabled:opacity-40"
          aria-label="Enviar"
        >
          <SendIcon size={15} />
        </button>
      </form>
    </div>
  );
}

function Capability({ label }: { label: string }) {
  return (
    <div className="flex items-center gap-1.5 rounded-lg bg-[var(--surface-2)] px-2.5 py-2 text-[11px] font-medium text-[var(--text-secondary)]">
      <span aria-hidden="true" className="h-1 w-1 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />
      {label}
    </div>
  );
}

function CoachAvatar() {
  return (
    <span
      className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full"
      style={{ background: "var(--accent-soft)" }}
    >
      <LogoMark size={12} />
    </span>
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
