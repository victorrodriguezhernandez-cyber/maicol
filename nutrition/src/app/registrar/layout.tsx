"use client";

import { useRouter } from "next/navigation";

export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)]">
      <header className="safe-top safe-x flex items-center gap-2 border-b border-[var(--border)] px-4 py-3">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Cerrar"
          className="flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-primary)]"
        >
          ✕
        </button>
        <p className="text-sm font-medium text-[var(--text-secondary)]">Registrar</p>
      </header>
      <main className="safe-x safe-bottom mx-auto w-full max-w-lg flex-1 px-4 py-4">
        {children}
      </main>
    </div>
  );
}
