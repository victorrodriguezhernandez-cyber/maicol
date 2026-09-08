"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

type Mode = "magic" | "password";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("magic");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  function switchMode(next: Mode) {
    setMode(next);
    setErrorMessage(null);
    setStatus("idle");
  }

  async function handleMagicLink(e: React.FormEvent) {
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

  async function handlePasswordLogin(e: React.FormEvent) {
    e.preventDefault();
    setStatus("sending");
    setErrorMessage(null);

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      setStatus("error");
      setErrorMessage(
        error.message === "Invalid login credentials"
          ? "Email o contraseña incorrectos — o todavía no has establecido una contraseña para esta cuenta."
          : error.message,
      );
      return;
    }
    // signInWithPassword sets the session cookie itself (via the browser
    // client); a plain redirect + refresh is enough, no /auth/callback hop.
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

      {status === "sent" ? (
        <div className="glass-panel w-full max-w-sm rounded-2xl p-5 text-center">
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
        <div className="w-full max-w-sm">
          <div className="mb-3 flex justify-center gap-1.5">
            <button
              type="button"
              onClick={() => switchMode("magic")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                mode === "magic"
                  ? "btn-primary text-[var(--accent-fg)]"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
              }`}
            >
              Enlace por email
            </button>
            <button
              type="button"
              onClick={() => switchMode("password")}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition-colors duration-150 ${
                mode === "password"
                  ? "btn-primary text-[var(--accent-fg)]"
                  : "bg-[var(--surface-2)] text-[var(--text-secondary)]"
              }`}
            >
              Contraseña
            </button>
          </div>

          <form
            onSubmit={mode === "magic" ? handleMagicLink : handlePasswordLogin}
            className="glass-panel rounded-2xl p-5"
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
              className="w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
            />

            {mode === "password" ? (
              <>
                <label
                  htmlFor="password"
                  className="mb-2 mt-3 block text-xs font-medium text-[var(--text-secondary)]"
                >
                  Contraseña
                </label>
                <input
                  id="password"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2.5 text-sm text-[var(--text-primary)]"
                />
              </>
            ) : null}

            {errorMessage ? (
              <p className="mt-2 text-xs text-[var(--danger)]">{errorMessage}</p>
            ) : null}

            <button
              type="submit"
              disabled={status === "sending"}
              className="mt-4 w-full rounded-xl btn-primary py-2.5 text-sm font-medium disabled:opacity-60"
            >
              {status === "sending"
                ? mode === "magic"
                  ? "Enviando…"
                  : "Entrando…"
                : mode === "magic"
                  ? "Enviar enlace de acceso"
                  : "Iniciar sesión"}
            </button>
          </form>

          {mode === "password" ? (
            <p className="mt-3 text-center text-xs text-[var(--text-secondary)]">
              ¿Todavía no tienes contraseña? Entra con enlace por email y
              configúrala en Ajustes → Seguridad y acceso.
            </p>
          ) : null}
        </div>
      )}
    </main>
  );
}
