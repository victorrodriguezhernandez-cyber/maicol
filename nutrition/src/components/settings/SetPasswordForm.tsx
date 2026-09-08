"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

/**
 * Lets an already-authenticated user change the single word they type on
 * the login screen ("Usuario"). Under the hood it's still a Supabase Auth
 * password (against the one fixed account email the login page already
 * knows) — supabase.auth.updateUser() just needs an active session, which
 * this always has (the page that hosts it redirects to /login otherwise),
 * so changing it never sends an email either.
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
      setError("Debe tener al menos 6 caracteres.");
      return;
    }
    if (password !== confirm) {
      setError("Las dos no coinciden.");
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
        <p className="text-sm font-medium text-[var(--text-primary)]">Usuario de acceso</p>
        <p className="mt-1 text-xs text-[var(--text-secondary)]">
          Es lo único que escribes en la pantalla de entrada. Cámbialo aquí
          cuando quieras.
        </p>
      </div>

      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Nuevo usuario</span>
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Mínimo 6 caracteres"
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        />
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs text-[var(--text-secondary)]">Repítelo</span>
        <input
          type="text"
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
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
        {status === "saving" ? "Guardando…" : status === "saved" ? "Guardado ✓" : "Guardar"}
      </button>
    </form>
  );
}
