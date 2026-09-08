"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Lets an already-authenticated user attach a password to their account —
 * so future logins can use email+password (signInWithPassword) instead of
 * a magic-link email every time. Supabase's own auth.updateUser() call
 * requires an active session, which this always has (the page that hosts
 * it redirects to /login otherwise), so this never triggers a
 * confirmation email — no interaction with the email rate limit at all.
 */
export function SetPasswordForm() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [status, setStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las dos contraseñas no coinciden.");
      return;
    }
    setStatus("saving");
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });
    if (updateError) {
      setStatus("error");
      setError(updateError.message);
      return;
    }
    setStatus("saved");
    setPassword("");
    setConfirm("");
    setTimeout(() => setStatus("idle"), 2500);
  }

  return (
    <form onSubmit={handleSubmit} className="glass-panel flex flex-col gap-3 rounded-2xl p-4">
      <div>
        <p className="text-sm font-medium text-[var(--text-primary)]">Contraseña de acceso</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Establécela o cámbiala aquí. Con una contraseña puedes entrar en el
          momento, sin esperar a un enlace por email.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Nueva contraseña</span>
        <input
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Repite la contraseña</span>
        <input
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </label>

      {error ? <p className="text-xs text-[var(--danger)]">{error}</p> : null}

      <button
        type="submit"
        disabled={!password || !confirm || status === "saving"}
        className="rounded-xl btn-primary py-2.5 text-sm font-medium text-[var(--accent-fg)] disabled:opacity-50"
      >
        {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado ✓" : "Guardar contraseña"}
      </button>
    </form>
  );
}
