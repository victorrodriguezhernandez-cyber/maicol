"use client";

import { useEffect, useRef, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { MealComposer, type DraftItem } from "@/components/register/MealComposer";
import { aiItemToDraft, type AiMealEstimateResponse } from "@/lib/nutrition/ai-estimate-to-item";
import { EmptyState } from "@/components/ui/EmptyState";

type State =
  | { kind: "idle" }
  | { kind: "recording" }
  | { kind: "analyzing" }
  | { kind: "result"; result: AiMealEstimateResponse }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

export default function VozEntryPage() {
  const [state, setState] = useState<State>({ kind: "idle" });
  const [seconds, setSeconds] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  async function startRecording() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const recorder = new MediaRecorder(stream);
    chunksRef.current = [];
    recorder.ondataavailable = (e) => chunksRef.current.push(e.data);
    recorder.start();
    mediaRecorderRef.current = recorder;
    setSeconds(0);
    timerRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setState({ kind: "recording" });
  }

  function cancelRecording() {
    mediaRecorderRef.current?.stream.getTracks().forEach((t) => t.stop());
    mediaRecorderRef.current?.stop();
    if (timerRef.current) clearInterval(timerRef.current);
    setState({ kind: "idle" });
  }

  async function finishRecording() {
    const recorder = mediaRecorderRef.current;
    if (!recorder) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setState({ kind: "analyzing" });

    const blob: Blob = await new Promise((resolve) => {
      recorder.onstop = () => resolve(new Blob(chunksRef.current, { type: recorder.mimeType }));
      recorder.stop();
      recorder.stream.getTracks().forEach((t) => t.stop());
    });

    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve((reader.result as string).split(",")[1] ?? "");
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });

    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("analyze-voice", {
      body: { audio: { data: base64, mimeType: blob.type || "audio/webm" } },
    });
    if (error) {
      // error.message here is supabase-js's own generic wrapper text ("Edge
      // Function returned a non-2xx status code"), not anything useful to
      // show someone — the specific case worth surfacing (no key configured)
      // already has its own branch below.
      setState({ kind: "error", message: "No se ha podido analizar el audio. Inténtalo de nuevo en unos segundos." });
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
      : state.result.items.map((i) => aiItemToDraft(i, "ai_voice_estimation"));
    return (
      <div className="flex flex-col gap-4">
        {state.result.unable_to_estimate ? (
          <div className="glass-panel rounded-2xl p-4 text-sm text-[var(--text-primary)]">
            <p className="font-medium">No hemos entendido bien el audio.</p>
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
    <div className="flex flex-col items-center gap-6 py-8">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Hablar</h1>

      {state.kind === "idle" ? (
        <button
          type="button"
          onClick={startRecording}
          className="flex h-24 w-24 items-center justify-center rounded-full btn-primary text-3xl text-[var(--accent-fg)]"
        >
          🎙️
        </button>
      ) : null}

      {state.kind === "recording" ? (
        <div className="flex flex-col items-center gap-4">
          <div className="flex h-24 w-24 animate-pulse items-center justify-center rounded-full bg-[var(--danger)] text-3xl text-white">
            🎙️
          </div>
          <p className="text-sm tabular-nums text-[var(--text-secondary)]">
            {String(Math.floor(seconds / 60)).padStart(2, "0")}:{String(seconds % 60).padStart(2, "0")}
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={cancelRecording}
              className="rounded-xl btn-secondary px-4 py-2 text-sm font-medium"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={finishRecording}
              className="rounded-xl btn-primary px-4 py-2 text-sm font-medium text-[var(--accent-fg)]"
            >
              Finalizar
            </button>
          </div>
        </div>
      ) : null}

      {state.kind === "analyzing" ? (
        <p className="text-sm text-[var(--text-secondary)]">Analizando…</p>
      ) : null}
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
    </div>
  );
}
