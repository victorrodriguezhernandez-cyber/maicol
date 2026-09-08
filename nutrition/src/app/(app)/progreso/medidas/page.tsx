import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { MeasurementForm } from "@/components/progress/MeasurementForm";
import { EmptyState } from "@/components/ui/EmptyState";

const TYPE_LABEL: Record<string, string> = {
  waist: "Cintura",
  chest: "Pecho",
  arm: "Brazo",
  thigh: "Muslo",
  hip: "Cadera",
  neck: "Cuello",
  custom: "Otra",
};

export default async function MedidasPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: measurements } = await supabase
    .from("body_measurements")
    .select("*")
    .eq("user_id", user.id)
    .order("measured_at", { ascending: false })
    .limit(50);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-lg font-semibold text-[var(--text-primary)]">Medidas corporales</h1>
      <MeasurementForm />

      {!measurements?.length ? (
        <EmptyState title="Todavía no tienes medidas registradas" />
      ) : (
        <ul className="flex flex-col divide-y divide-[var(--border-soft)] border-t border-[var(--border-soft)]">
          {measurements.map((m) => (
            <li key={m.id} className="flex items-center justify-between py-2.5 text-sm">
              <span className="font-medium text-[var(--text-primary)]">
                {m.measurement_type === "custom" ? m.custom_label : TYPE_LABEL[m.measurement_type]}
              </span>
              <span className="text-[var(--text-tertiary)]">
                {new Date(m.measured_at).toLocaleDateString("es-ES")}
              </span>
              <span className="font-numeric font-semibold text-[var(--text-primary)]">{m.value_cm} cm</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
