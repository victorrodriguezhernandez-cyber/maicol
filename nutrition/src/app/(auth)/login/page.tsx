"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Single-user personal app — there is only ever one account, so the
// email behind it never needs to be typed or shown. Framing the one
// field as "Usuario" and using its value as the Supabase Auth password
// (against this fixed, known email) is what lets sign-in be a single
// word with no email step at all — no magic link, so it never touches
// Supabase's email-sending rate limit either.
const ACCOUNT_EMAIL = "victorhub2008@gmail.com";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({
      email: ACCOUNT_EMAIL,
      password: username,
    });

    if (error) {
      setStatus("error");
      setErrorMessage("Usuario incorrecto.");
      return;
    }
    router.push("/");
    router.refresh();
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-[var(--app-bg)] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex flex-col items-center gap-2 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl btn-primary text-xl font-semibold">
          M
        </div>
        <h1 className="text-xl font-semibold text-[var(--text-primary)]">
          Maicol Nutrición
        </h1>
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          Tu seguimiento personal de nutrición y volumen, asistido por IA.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="glass-panel w-full max-w-sm rounded-2xl p-5"
      >
        <label
          htmlFor="username"
          className="mb-2 block text-xs font-medium text-[var(--text-secondary)]"
        >
          Usuario
        </label>
        <input
          id="username"
          type="text"
          required
          autoComplete="username"
          autoCapitalize="none"
          autoCorrect="off"
          autoFocus
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="victorrh2008"
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
        />
        {errorMessage ? (
          <p className="mt-2 text-xs text-[var(--danger)]">{errorMessage}</p>
        ) : null}
        <button
          type="submit"
          disabled={status === "sending" || !username}
          className="mt-4 w-full rounded-xl btn-primary py-2.5 text-sm font-medium disabled:opacity-60"
        >
          {status === "sending" ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
