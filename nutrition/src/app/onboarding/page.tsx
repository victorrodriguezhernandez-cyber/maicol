"use client";

import { useMemo, useState } from "react";
import { completeOnboarding } from "./actions";
import { suggestGoal } from "@/lib/nutrition/goal-suggestion";
import type { ActivityLevel } from "@/lib/nutrition/tdee";

const MODE_LABEL: Record<string, string> = {
  maintain: "Mantener",
  lose: "Perder peso",
  gain: "Ganar peso / volumen",
};

function ageFromBirthDate(birthDate: string): number {
  if (!birthDate) return 25;
  const diff = Date.now() - new Date(birthDate).getTime();
  return Math.max(14, Math.floor(diff / (365.25 * 24 * 60 * 60 * 1000)));
}

export default function OnboardingPage() {
  const [sex, setSex] = useState<"male" | "female" | "unspecified">("unspecified");
  const [birthDate, setBirthDate] = useState("");
  const [heightCm, setHeightCm] = useState("175");
  const [currentWeightKg, setCurrentWeightKg] = useState("75");
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>("moderate");
  const [mode, setMode] = useState<"maintain" | "lose" | "gain">("gain");
  const [weeklyRateMinKg, setWeeklyRateMinKg] = useState("0.2");
  const [weeklyRateMaxKg, setWeeklyRateMaxKg] = useState("0.3");
  const [targetWeightKg, setTargetWeightKg] = useState("");

  const [kcal, setKcal] = useState("2800");
  const [proteinG, setProteinG] = useState("170");
  const [carbohydratesG, setCarbohydratesG] = useState("360");
  const [fatG, setFatG] = useState("80");
  const [fiberG, setFiberG] = useState("35");
  const [submitting, setSubmitting] = useState(false);

  const canSuggest = useMemo(
    () => Number(heightCm) > 0 && Number(currentWeightKg) > 0 && birthDate,
    [heightCm, currentWeightKg, birthDate],
  );

  function applySuggestion() {
    const min = Number(weeklyRateMinKg);
    const max = Number(weeklyRateMaxKg);
    const midpoint = mode === "maintain" ? 0 : (min + max) / 2;
    const suggestion = suggestGoal({
      weightKg: Number(currentWeightKg),
      heightCm: Number(heightCm),
      age: ageFromBirthDate(birthDate),
      sex,
      activityLevel,
      mode,
      weeklyRateKgPerWeek: mode === "lose" ? -Math.abs(midpoint) : midpoint,
    });
    setKcal(String(suggestion.kcal));
    setProteinG(String(suggestion.proteinG));
    setCarbohydratesG(String(suggestion.carbohydratesG));
    setFatG(String(suggestion.fatG));
    setFiberG(String(suggestion.fiberG));
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-lg flex-col gap-6 px-5 pb-12 pt-[calc(env(safe-area-inset-top)+24px)]">
      <div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Vamos a configurar tu perfil
        </h1>
        <p className="mt-1 text-sm text-[var(--text-secondary)]">
          Esto nos permite calcular tus objetivos iniciales. Podrás ajustarlo
          todo más adelante en Ajustes.
        </p>
      </div>

      <section className="glass-panel rounded-2xl p-4">
        <p className="mb-1 text-xs font-medium text-[var(--text-secondary)]">
          Protocolo de pesaje
        </p>
        <p className="text-xs text-[var(--text-secondary)]">
          Para comparar mejor tus pesos, intenta pesarte en condiciones
          similares: por la mañana, después de ir al baño y antes de comer o
          beber. No pasa nada si algún día lo haces en otro momento — el
          sistema usa una tendencia, no el dato de un único día.
        </p>
      </section>

      <form
        action={async (formData) => {
          setSubmitting(true);
          await completeOnboarding(formData);
        }}
        className="flex flex-col gap-5"
      >
        <fieldset className="grid grid-cols-2 gap-3">
          <Field label="Sexo">
            <select
              name="sex"
              value={sex}
              onChange={(e) => setSex(e.target.value as typeof sex)}
              className="input"
            >
              <option value="unspecified">Prefiero no decirlo</option>
              <option value="male">Hombre</option>
              <option value="female">Mujer</option>
            </select>
          </Field>
          <Field label="Fecha de nacimiento">
            <input
              type="date"
              name="birthDate"
              required
              value={birthDate}
              onChange={(e) => setBirthDate(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Altura (cm)">
            <input
              type="number"
              name="heightCm"
              required
              value={heightCm}
              onChange={(e) => setHeightCm(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Peso actual (kg)">
            <input
              type="number"
              step="0.1"
              name="currentWeightKg"
              required
              value={currentWeightKg}
              onChange={(e) => setCurrentWeightKg(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Actividad">
            <select
              value={activityLevel}
              onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
              className="input"
            >
              <option value="sedentary">Sedentaria</option>
              <option value="light">Ligera</option>
              <option value="moderate">Moderada</option>
              <option value="very_active">Alta</option>
              <option value="extra_active">Muy alta</option>
            </select>
          </Field>
          <Field label="Objetivo">
            <select
              name="mode"
              value={mode}
              onChange={(e) => setMode(e.target.value as typeof mode)}
              className="input"
            >
              {Object.entries(MODE_LABEL).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
          </Field>
        </fieldset>

        {mode !== "maintain" ? (
          <fieldset className="grid grid-cols-2 gap-3">
            <Field label="Ritmo mínimo (kg/semana)">
              <input
                type="number"
                step="0.05"
                name="weeklyRateMinKg"
                value={weeklyRateMinKg}
                onChange={(e) => setWeeklyRateMinKg(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Ritmo máximo (kg/semana)">
              <input
                type="number"
                step="0.05"
                name="weeklyRateMaxKg"
                value={weeklyRateMaxKg}
                onChange={(e) => setWeeklyRateMaxKg(e.target.value)}
                className="input"
              />
            </Field>
            <Field label="Peso objetivo (kg, opcional)">
              <input
                type="number"
                step="0.1"
                name="targetWeightKg"
                value={targetWeightKg}
                onChange={(e) => setTargetWeightKg(e.target.value)}
                className="input"
              />
            </Field>
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="weeklyRateMinKg" value="0" />
            <input type="hidden" name="weeklyRateMaxKg" value="0" />
          </>
        )}

        <div className="flex items-center justify-between">
          <p className="text-xs font-medium text-[var(--text-secondary)]">
            Objetivos diarios
          </p>
          <button
            type="button"
            disabled={!canSuggest}
            onClick={applySuggestion}
            className="text-xs font-medium text-[var(--accent)] disabled:opacity-40"
          >
            Sugerir automáticamente
          </button>
        </div>
        <fieldset className="grid grid-cols-2 gap-3">
          <Field label="Calorías (kcal)">
            <input
              type="number"
              name="kcal"
              required
              value={kcal}
              onChange={(e) => setKcal(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Proteína (g)">
            <input
              type="number"
              name="proteinG"
              required
              value={proteinG}
              onChange={(e) => setProteinG(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Carbohidratos (g)">
            <input
              type="number"
              name="carbohydratesG"
              required
              value={carbohydratesG}
              onChange={(e) => setCarbohydratesG(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Grasas (g)">
            <input
              type="number"
              name="fatG"
              required
              value={fatG}
              onChange={(e) => setFatG(e.target.value)}
              className="input"
            />
          </Field>
          <Field label="Fibra (g, opcional)">
            <input
              type="number"
              name="fiberG"
              value={fiberG}
              onChange={(e) => setFiberG(e.target.value)}
              className="input"
            />
          </Field>
        </fieldset>

        <button
          type="submit"
          disabled={submitting}
          className="mt-2 w-full rounded-xl btn-primary py-3 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-60"
        >
          {submitting ? "Guardando…" : "Empezar"}
        </button>
      </form>

      <style jsx global>{`
        .input {
          width: 100%;
          border-radius: 0.75rem;
          border: 1px solid var(--border);
          background: var(--app-bg);
          padding: 0.5rem 0.75rem;
          font-size: 0.875rem;
          color: var(--text-primary);
        }
      `}</style>
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1">
      <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      {children}
    </label>
  );
}
