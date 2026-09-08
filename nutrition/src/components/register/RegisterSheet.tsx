"use client";

import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";

interface RegisterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const OPTIONS = [
  { href: "/registrar/foto", label: "Fotografiar comida", icon: "📷" },
  { href: "/registrar/foto?multi=1", label: "Varias fotografías", icon: "📷" },
  { href: "/registrar/etiqueta", label: "Fotografiar etiqueta", icon: "🏷️" },
  { href: "/registrar/voz", label: "Hablar", icon: "🎙️" },
  { href: "/registrar/texto", label: "Escribir", icon: "⌨️" },
  { href: "/registrar/buscar", label: "Buscar alimento", icon: "🔎" },
  { href: "/registrar/manual", label: "Introducir manualmente", icon: "⚖️" },
  { href: "/registrar/receta", label: "Receta", icon: "🍽️" },
  { href: "/registrar/favoritos", label: "Favoritos / recientes", icon: "❤️" },
] as const;

export function RegisterSheet({ open, onOpenChange }: RegisterSheetProps) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Registrar comida">
      <ul className="divide-y divide-[var(--border)]">
        {OPTIONS.map((opt) => (
          <li key={opt.href}>
            <button
              type="button"
              onClick={() => go(opt.href)}
              className="flex w-full items-center gap-3 px-3 py-3.5 text-left active:bg-[var(--surface-2)]"
            >
              <span className="text-lg leading-none">{opt.icon}</span>
              <span className="text-[15px] text-[var(--text-primary)]">
                {opt.label}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </Sheet>
  );
}
