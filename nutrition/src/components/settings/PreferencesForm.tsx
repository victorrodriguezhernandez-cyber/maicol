"use client";

import { useState, useTransition } from "react";
import { updateProfile, updatePreferences } from "@/lib/actions/preferences";

interface Props {
  displayName: string | null;
  heightCm: number | null;
  theme: "system" | "light" | "dark";
  weightUnit: "kg" | "lb";
  timeFormat: "24h" | "12h";
  startOfWeek: number;
}

export function PreferencesForm(props: Props) {
  const [displayName, setDisplayName] = useState(props.displayName ?? "");
  const [heightCm, setHeightCm] = useState(props.heightCm != null ? String(props.heightCm) : "");
  const [theme, setTheme] = useState(props.theme);
  const [weightUnit, setWeightUnit] = useState(props.weightUnit);
  const [timeFormat, setTimeFormat] = useState(props.timeFormat);
  const [startOfWeek, setStartOfWeek] = useState(props.startOfWeek);
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function applyThemeLocally(value: typeof theme) {
    try {
      if (value === "system") {
        localStorage.removeItem("theme");
        document.documentElement.removeAttribute("data-theme");
      } else {
        localStorage.setItem("theme", value);
        document.documentElement.setAttribute("data-theme", value);
      }
    } catch {
      // localStorage can throw in private browsing — theme just won't persist.
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    applyThemeLocally(theme);
    startTransition(async () => {
      await Promise.all([
        updateProfile({ displayName: displayName || null, heightCm: heightCm ? Number(heightCm) : null }),
        updatePreferences({ theme, weightUnit, timeFormat, startOfWeek }),
      ]);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-3.5 rounded-2xl p-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Nombre</span>
        <input
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Altura (cm)</span>
        <input
          type="number"
          value={heightCm}
          onChange={(e) => setHeightCm(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </label>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Apariencia</span>
        <select
          value={theme}
          onChange={(e) => setTheme(e.target.value as typeof theme)}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value="system">Seguir sistema</option>
          <option value="light">Claro</option>
          <option value="dark">Oscuro</option>
        </select>
      </label>

      <div className="grid grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Unidad de peso</span>
          <select
            value={weightUnit}
            onChange={(e) => setWeightUnit(e.target.value as typeof weightUnit)}
            className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="kg">kg</option>
            <option value="lb">lb</option>
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs text-[var(--text-secondary)]">Formato de hora</span>
          <select
            value={timeFormat}
            onChange={(e) => setTimeFormat(e.target.value as typeof timeFormat)}
            className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
          >
            <option value="24h">24 h</option>
            <option value="12h">12 h</option>
          </select>
        </label>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Inicio de semana</span>
        <select
          value={startOfWeek}
          onChange={(e) => setStartOfWeek(Number(e.target.value))}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          <option value={1}>Lunes</option>
          <option value={0}>Domingo</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={isPending}
        className="rounded-xl btn-primary py-2.5 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        {isPending ? "Guardando…" : saved ? "Guardado ✓" : "Guardar cambios"}
      </button>
    </form>
  );
}
