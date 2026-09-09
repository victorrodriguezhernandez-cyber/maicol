"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Logo } from "@/components/ui/Logo";
import { LockIcon } from "@/components/ui/icons";

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
    <main className="relative flex min-h-dvh flex-col items-center justify-center gap-10 overflow-hidden bg-[var(--app-bg)] px-6 pb-[env(safe-area-inset-bottom)] pt-[env(safe-area-inset-top)]">
      <div className="flex flex-col items-center gap-3 text-center">
        <Logo full className="flex-col gap-3 text-center [&>div]:items-center" />
        <p className="max-w-xs text-sm text-[var(--text-secondary)]">
          Tu seguimiento personal de nutrición y volumen, asistido por IA.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="surface-raised w-full max-w-sm p-6">
        <label htmlFor="username" className="mb-2 flex items-center gap-1.5 text-xs font-semibold text-[var(--text-secondary)]">
          <LockIcon size={13} /> Usuario
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
          className="w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3.5 py-3 text-[15px] text-[var(--text-primary)]"
        />
        {errorMessage ? (
          <p className="mt-2 text-xs text-[var(--danger)]">{errorMessage}</p>
        ) : null}
        <button
          type="submit"
          disabled={status === "sending" || !username}
          className="btn-primary tap-scale mt-4 w-full rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)] disabled:opacity-60"
        >
          {status === "sending" ? "Entrando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
