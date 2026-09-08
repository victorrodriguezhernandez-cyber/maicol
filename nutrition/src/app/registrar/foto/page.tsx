"use client";

import { Suspense, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { compressImageToBase64 } from "@/lib/image";
import { MealComposer, type DraftItem } from "@/components/register/MealComposer";
import { aiItemToDraft, type AiMealEstimateResponse } from "@/lib/nutrition/ai-estimate-to-item";
import { EmptyState } from "@/components/ui/EmptyState";

type State =
  | { kind: "idle" }
  | { kind: "analyzing" }
  | { kind: "result"; result: AiMealEstimateResponse }
  | { kind: "unavailable" }
  | { kind: "error"; message: string };

export default function FotoCapturaPage() {
  return (
    <Suspense fallback={null}>
      <FotoCapturaInner />
    </Suspense>
  );
}

function FotoCapturaInner() {
  const [photos, setPhotos] = useState<{ preview: string; data: string; mimeType: string }[]>([]);
  const [referenceNote, setReferenceNote] = useState("");
  const [state, setState] = useState<State>({ kind: "idle" });

  async function handleFiles(files: FileList | null) {
    if (!files?.length) return;
    const compressed = await Promise.all(
      Array.from(files).map(async (file) => {
        const { data, mimeType } = await compressImageToBase64(file);
        return { preview: URL.createObjectURL(file), data, mimeType };
      }),
    );
    setPhotos((prev) => [...prev, ...compressed]);
  }

  async function analyze() {
    if (photos.length === 0) return;
    setState({ kind: "analyzing" });
    const supabase = createClient();
    const { data, error } = await supabase.functions.invoke("analyze-meal-photo", {
      body: {
        images: photos.map((p) => ({ data: p.data, mimeType: p.mimeType })),
        referenceNote: referenceNote.trim() || undefined,
      },
    });
    if (error) {
      // error.message here is supabase-js's own generic wrapper text ("Edge
      // Function returned a non-2xx status code"), not anything useful to
      // show someone — the specific case worth surfacing (no key configured)
      // already has its own branch below.
      setState({ kind: "error", message: "No se ha podido analizar la foto. Inténtalo de nuevo en unos segundos." });
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
      : state.result.items.map((i) => aiItemToDraft(i, "ai_photo_estimation"));

    return (
      <div className="flex flex-col gap-4">
        {state.result.unable_to_estimate ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              No hemos podido estimar esta comida con esta fotografía.
            </p>
            <ul className="mt-2 list-disc pl-4 text-xs text-[var(--text-secondary)]">
              {state.result.clarifying_questions.map((q, i) => (
                <li key={i}>{q}</li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-[var(--text-secondary)]">
              Puedes terminar de registrarla manualmente abajo.
            </p>
          </div>
        ) : null}
        <MealComposer initialItems={draftItems} title="Revisar estimación" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Fotografiar comida</h1>

      {photos.length === 0 ? (
        <label className="flex cursor-pointer flex-col items-center gap-2 rounded-2xl border border-dashed border-[var(--border)] px-6 py-10 text-center">
          <span className="text-3xl">📷</span>
          <span className="text-sm font-medium text-[var(--accent)]">Hacer fotografía(s)</span>
          <input
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
        </label>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((p, i) => (
            // eslint-disable-next-line @next/next/no-img-element
            <img key={i} src={p.preview} alt="" className="aspect-square rounded-xl object-cover" />
          ))}
          <label className="flex aspect-square cursor-pointer items-center justify-center rounded-xl border border-dashed border-[var(--border)] text-2xl text-[var(--accent)]">
            +
            <input
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              className="hidden"
              onChange={(e) => handleFiles(e.target.files)}
            />
          </label>
        </div>
      )}

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">
          Referencia de tamaño (opcional) — ej. &quot;plato de 27cm, la carne pesa 200g&quot;
        </span>
        <input
          value={referenceNote}
          onChange={(e) => setReferenceNote(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--surface)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </label>

      {state.kind === "unavailable" ? (
        <EmptyState
          title="La IA no está disponible ahora mismo"
          description="Puedes registrar el alimento manualmente mientras tanto."
          action={
            <a href="/registrar/manual" className="text-sm font-medium text-[var(--accent)]">
              Introducir manualmente →
            </a>
          }
        />
      ) : null}
      {state.kind === "error" ? (
        <p className="text-sm text-[var(--danger)]">{state.message}</p>
      ) : null}

      <button
        type="button"
        disabled={photos.length === 0 || state.kind === "analyzing"}
        onClick={analyze}
        className="rounded-xl bg-[var(--accent)] py-3 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        {state.kind === "analyzing" ? "Analizando…" : "Analizar"}
      </button>
    </div>
  );
}
