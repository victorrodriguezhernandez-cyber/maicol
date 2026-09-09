import { redirect } from "next/navigation";
import { createClient, getUser } from "@/lib/supabase/server";
import { ProgressPhotoUploader } from "@/components/progress/ProgressPhotoUploader";
import { DeleteProgressPhotoButton } from "@/components/progress/DeleteProgressPhotoButton";
import { EmptyState } from "@/components/ui/EmptyState";
import { PageShell } from "@/components/ui/PageShell";
import { formatDateShort } from "@/lib/format";

const CATEGORY_LABEL: Record<string, string> = {
  front: "Frontal",
  side: "Lateral",
  back: "Espalda",
  free: "Libre",
};

export default async function FotosProgresoPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await getUser(supabase);
  if (!user) redirect("/login");

  const { data: photos } = await supabase
    .from("progress_photos")
    .select("*")
    .eq("user_id", user.id)
    .order("taken_at", { ascending: false })
    .limit(60);

  const withUrls = await Promise.all(
    (photos ?? []).map(async (p) => {
      const { data } = await supabase.storage
        .from("progress-images")
        .createSignedUrl(p.storage_path, 60 * 30);
      return { ...p, signedUrl: data?.signedUrl ?? null };
    }),
  );

  return (
    <PageShell title="Fotos de progreso">
      <ProgressPhotoUploader />

      {withUrls.length === 0 ? (
        <EmptyState title="Todavía no tienes fotos de progreso" />
      ) : (
        <div className="grid grid-cols-2 gap-2.5">
          {withUrls.map((p) => (
            <div key={p.id} className="relative overflow-hidden rounded-2xl border border-[var(--border-soft)]">
              {p.signedUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={p.signedUrl} alt={CATEGORY_LABEL[p.category]} className="aspect-[3/4] w-full object-cover" />
              ) : (
                <div className="flex aspect-[3/4] w-full items-center justify-center text-xs text-[var(--text-secondary)]">
                  No disponible
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-2.5 pb-2 pt-5">
                <span className="text-[11px] font-medium text-white">
                  {CATEGORY_LABEL[p.category]} · {formatDateShort(p.taken_at)}
                </span>
                <DeleteProgressPhotoButton id={p.id} storagePath={p.storage_path} />
              </div>
            </div>
          ))}
        </div>
      )}
    </PageShell>
  );
}
