"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      setStatus("error");
      setErrorMessage(error.message);
      return;
    }
    setStatus("sent");
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[var(--app-bg)] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--accent)] text-xl font-semibold text-white">
          M
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Maicol Nutrición
        </h1>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          Tu seguimiento personal de nutrición y volumen, asistido por IA.
        </p>
      </div>

      {status === "sent" ? (
        <div className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5 text-center">
          <p className="text-sm text-[var(--text-primary)]">
            Te hemos enviado un enlace de acceso a
          </p>
          <p className="mt-1 text-sm font-medium text-[var(--text-primary)]">
            {email}
          </p>
          <p className="mt-3 text-xs text-[var(--text-secondary)]">
            Ábrelo desde este mismo iPhone para iniciar sesión.
          </p>
        </div>
      ) : (
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-sm rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-5"
        >
          <label
            htmlFor="email"
            className="mb-2 block text-xs font-medium text-[var(--text-secondary)]"
          >
            Correo electrónico
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="tu@correo.com"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--accent)]"
          />
          {errorMessage ? (
            <p className="mt-2 text-xs text-red-500">{errorMessage}</p>
          ) : null}
          <button
            type="submit"
            disabled={status === "sending"}
            className="mt-4 w-full rounded-xl bg-[var(--accent)] py-2.5 text-sm font-medium text-white disabled:opacity-60"
          >
            {status === "sending" ? "Enviando…" : "Enviar enlace de acceso"}
          </button>
        </form>
      )}
    </main>
  );
}
