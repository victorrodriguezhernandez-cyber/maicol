"use client";

import { useRouter } from "next/navigation";
import { CloseIcon } from "@/components/ui/icons";

export default function RegistrarLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  return (
    <div className="flex min-h-dvh flex-col bg-[var(--app-bg)]">
      <header className="safe-top flex items-center gap-2 border-b border-[var(--border-soft)] bg-[var(--app-bg)]/90 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-3 backdrop-blur-xl">
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
      <main className="safe-bottom mx-auto w-full max-w-lg flex-1 pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))] py-4">
        {children}
      </main>
    </div>
  );
}
