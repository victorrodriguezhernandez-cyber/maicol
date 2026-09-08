"use client";

import { useTransition } from "react";
import { deleteProgressPhoto } from "@/lib/actions/weight";

export function DeleteProgressPhotoButton({ id, storagePath }: { id: string; storagePath: string }) {
  const [isPending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={isPending}
      onClick={() => startTransition(() => deleteProgressPhoto(id, storagePath))}
      className="text-[11px] text-white/80 underline"
    >
      Eliminar
    </button>
  );
}
