"use client";

import { useTransition } from "react";
import { deleteWeightEntry } from "@/lib/actions/weight";

export function DeleteWeightButton({ id }: { id: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteWeightEntry(id))}
      className="text-xs text-[var(--danger)]"
    >
      Eliminar
    </button>
  );
}
