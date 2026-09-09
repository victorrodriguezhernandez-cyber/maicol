"use client";

import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/icons";

export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)]">
      <header className="safe-top safe-x flex items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--app-bg)]/90 px-4 py-3 backdrop-blur-xl">
        <button
          type="button"
          onClick={() => router.back()}
          aria-label="Cerrar"
          className="tap-scale flex h-8 w-8 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-primary)]"
        >
          <CloseIcon size={15} />
        </button>
        <p className="text-xs font-semibold uppercase tracking-[0.08em] text-[var(--text-tertiary)]">Registrar</p>
      </header>
      <main className="safe-x safe-bottom mx-auto w-full max-w-lg flex-1 px-4 py-4">
        {children}
      </main>
    </div>
  );
}
