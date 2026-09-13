"use client";

import { useState } from "react";
import { addMeasurement } from "@/lib/actions/weight";
import { useActionRunner } from "@/lib/hooks/useActionRunner";

const TYPES = [
  { value: "waist", label: "Cintura" },
  { value: "chest", label: "Pecho" },
  { value: "arm", label: "Brazo" },
  { value: "thigh", label: "Muslo" },
  { value: "hip", label: "Cadera" },
  { value: "neck", label: "Cuello" },
  { value: "custom", label: "Otra" },
] as const;

export function MeasurementForm() {
  const [type, setType] = useState<(typeof TYPES)[number]["value"]>("waist");
  const [customLabel, setCustomLabel] = useState("");
  const [value, setValue] = useState("");
  const { run, isPending, error } = useActionRunner();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!value) return;
    run(async () => {
      await addMeasurement({
        measuredAt: new Date().toISOString(),
        measurementType: type,
        customLabel: type === "custom" ? customLabel : null,
        valueCm: Number(value),
      });
      // Cleared only after a successful write, so a failure doesn't wipe
      // the measurement the user just typed.
      setValue("");
      setCustomLabel("");
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel rounded-2xl p-4">
      <div className="grid grid-cols-2 gap-2">
        <select
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <div className="flex items-center gap-2">
          <input
            type="number"
            step="0.1"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="cm"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
          />
        </div>
      </div>
      {type === "custom" ? (
        <input
          value={customLabel}
          onChange={(e) => setCustomLabel(e.target.value)}
          placeholder="Nombre de la medida"
          className="mt-2 w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-[11px] text-[var(--danger)]">
          {error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={!value || isPending}
        className="mt-2 w-full rounded-xl btn-primary py-2 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : "Guardar medida"}
      </button>
    </form>
  );
}
