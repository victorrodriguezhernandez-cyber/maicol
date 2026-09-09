"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

interface SheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  children: React.ReactNode;
}

/**
 * A minimal, dependency-free bottom sheet. Locks body scroll while open,
 * closes on backdrop tap or Escape, and respects the safe-area inset so
 * it never sits under the iPhone home indicator.
 */
export function Sheet({ open, onOpenChange, title, children }: SheetProps) {
  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onOpenChange]);

  if (typeof document === "undefined") return null;
  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center">
      <button
        aria-label="Cerrar"
        className="absolute inset-0 bg-black/45 backdrop-blur-[1px] animate-[maicol-fade-in_.15s_ease-out]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="safe-bottom relative z-10 w-full max-w-lg rounded-t-[2rem] border-t border-x border-[var(--border)] bg-[var(--surface-overlay)] pb-4 shadow-[var(--shadow-lg)] animate-[maicol-slide-up_.22s_cubic-bezier(0.22,1,0.36,1)]"
      >
        <div className="mx-auto mt-2.5 h-1 w-9 rounded-full bg-[var(--border-strong)]" />
        {title ? (
          <h2 className="text-hero-title px-5 pt-3.5 text-[17px] text-[var(--text-primary)]">
            {title}
          </h2>
        ) : null}
        <div className="pt-2">{children}</div>
      </div>
    </div>,
    document.body,
  );
}
