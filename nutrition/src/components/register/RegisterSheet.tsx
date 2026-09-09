"use client";

import { useRouter } from "next/navigation";
import { Sheet } from "@/components/ui/Sheet";
import {
  CameraIcon,
  TagIcon,
  MicIcon,
  TextIcon,
  SearchIcon,
  KeypadIcon,
  BookIcon,
  StarIcon,
  StackedPhotosIcon,
} from "@/components/ui/icons";

interface RegisterSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

// The four fastest, most-used capture methods get a big tile of their
// own up top; everything else is a compact secondary row below — not
// nine identical list rows fighting for the same attention.
const QUICK_ACTIONS = [
  { href: "/registrar/foto", label: "Foto", hint: "Fotografía tu comida", icon: CameraIcon },
  { href: "/registrar/etiqueta", label: "Etiqueta", hint: "Foto a un envase", icon: TagIcon },
  { href: "/registrar/voz", label: "Hablar", hint: "Descríbelo en voz alta", icon: MicIcon },
  { href: "/registrar/texto", label: "Escribir", hint: "Descríbelo con texto", icon: TextIcon },
] as const;

const SECONDARY_ACTIONS = [
  { href: "/registrar/buscar", label: "Buscar alimento", icon: SearchIcon },
  { href: "/registrar/manual", label: "Introducir manualmente", icon: KeypadIcon },
  { href: "/registrar/receta", label: "Receta", icon: BookIcon },
  { href: "/registrar/favoritos", label: "Favoritos y recientes", icon: StarIcon },
] as const;

export function RegisterSheet({ open, onOpenChange }: RegisterSheetProps) {
  const router = useRouter();

  function go(href: string) {
    onOpenChange(false);
    router.push(href);
  }

  return (
    <Sheet open={open} onOpenChange={onOpenChange} title="Registrar comida">
      <div className="flex flex-col gap-5 px-3 pb-2 pt-1">
        <div className="grid grid-cols-2 gap-2.5">
          {QUICK_ACTIONS.map((opt) => (
            <button
              key={opt.href}
              type="button"
              onClick={() => go(opt.href)}
              className="tap-scale surface-soft flex flex-col items-start gap-2.5 p-3.5 text-left"
            >
              <span
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ background: "var(--accent-soft)", color: "var(--accent)" }}
              >
                <opt.icon size={18} />
              </span>
              <span>
                <span className="block text-[13.5px] font-semibold text-[var(--text-primary)]">
                  {opt.label}
                </span>
                <span className="block text-[11px] text-[var(--text-tertiary)]">{opt.hint}</span>
              </span>
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={() => go("/registrar/foto?multi=1")}
          className="tap-row -mt-2 flex items-center gap-2 self-start px-1 text-xs font-medium text-[var(--accent)]"
        >
          <StackedPhotosIcon size={14} /> Añadir varias fotografías a la vez
        </button>

        <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
          {SECONDARY_ACTIONS.map((opt) => (
            <li key={opt.href}>
              <button
                type="button"
                onClick={() => go(opt.href)}
                className="tap-row flex w-full items-center gap-3 py-3 text-left"
              >
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-[var(--surface-2)] text-[var(--text-secondary)]">
                  <opt.icon size={16} />
                </span>
                <span className="text-[14px] text-[var(--text-primary)]">{opt.label}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </Sheet>
  );
}
