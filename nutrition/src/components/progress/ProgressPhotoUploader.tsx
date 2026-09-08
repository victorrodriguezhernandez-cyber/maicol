"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { compressImageToBlob } from "@/lib/image";
import { createProgressPhotoRecord } from "@/lib/actions/weight";

const CATEGORIES = [
  { value: "front", label: "Frontal" },
  { value: "side", label: "Lateral" },
  { value: "back", label: "Espalda" },
  { value: "free", label: "Libre" },
] as const;

export function ProgressPhotoUploader() {
  const router = useRouter();
  const [category, setCategory] = useState<(typeof CATEGORIES)[number]["value"]>("front");
  const [uploading, setUploading] = useState(false);

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setUploading(true);
    try {
      const blob = await compressImageToBlob(file, 1600, 0.85);
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const path = `${user.id}/${crypto.randomUUID()}.jpg`;
      const { error: uploadError } = await supabase.storage
        .from("progress-images")
        .upload(path, blob, { contentType: "image/jpeg" });
      if (uploadError) throw uploadError;

      await createProgressPhotoRecord({
        takenAt: new Date().toISOString(),
        category,
        storagePath: path,
      });
      router.refresh();
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-4">
      <p className="mb-2 text-xs font-medium text-[var(--text-secondary)]">
        Estas fotografías son privadas y nunca se envían a la IA.
      </p>
      <div className="flex items-center gap-2">
        <select
          value={category}
          onChange={(e) => setCategory(e.target.value as typeof category)}
          className="rounded-xl border border-[var(--border)] bg-[var(--app-bg)] px-3 py-2 text-sm text-[var(--text-primary)]"
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>
              {c.label}
            </option>
          ))}
        </select>
        <label className="flex-1 cursor-pointer rounded-xl btn-primary px-3 py-2 text-center text-sm font-medium text-[var(--accent-fg)]">
          {uploading ? "Subiendo…" : "Añadir foto"}
          <input
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            disabled={uploading}
            onChange={(e) => handleFile(e.target.files?.[0])}
          />
        </label>
      </div>
    </div>
  );
}
