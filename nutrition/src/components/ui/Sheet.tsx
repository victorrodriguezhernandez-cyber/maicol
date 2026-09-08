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
        className="absolute inset-0 bg-black/40 backdrop-blur-[1px] animate-[fadeIn_.15s_ease-out]"
        onClick={() => onOpenChange(false)}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="safe-bottom relative z-10 w-full max-w-lg rounded-t-3xl border-t border-[var(--border)] bg-[var(--surface)] pb-4 shadow-2xl animate-[slideUp_.2s_ease-out]"
      >
        <div className="mx-auto mt-2.5 h-1.5 w-10 rounded-full bg-[var(--border)]" />
        {title ? (
          <h2 className="px-5 pt-3 text-base font-semibold text-[var(--text-primary)]">
            {title}
          </h2>
        ) : null}
        <div className="px-2 pt-2">{children}</div>
      </div>
      <style jsx global>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
        @keyframes fadeIn {
          from {
            opacity: 0;
          }
          to {
            opacity: 1;
          }
        }
      `}</style>
    </div>,
    document.body,
  );
}
