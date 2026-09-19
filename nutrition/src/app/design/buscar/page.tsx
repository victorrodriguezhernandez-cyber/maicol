import { notFound } from "next/navigation";
import { buscarEnFuentesExternas } from "@/lib/data/external-foods";
import { ETIQUETA_DE_MOTIVO, sufijoDeMarca } from "@/lib/nutrition/busqueda-alimentos";
import { NutrientPanel } from "@/components/ui/NutrientPanel";
import { formatKcal } from "@/lib/format";
import { MacroInline } from "@/components/ui/MacroInline";

/**
 * La lista de resultados con alimentos REALES de Open Food Facts y USDA
 * (development only, igual que el resto de `/design`).
 *
 * Existe porque `/registrar/buscar` está detrás del login y la única
 * forma de juzgar cómo queda una lista de resultados de verdad —nombres
 * largos, marcas que faltan, productos sin la mitad de los nutrientes—
 * es pintándola con lo que devuelven las fuentes, no con tres ejemplos
 * elegidos por mí.
 */
export default async function DesignBuscarPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  if (process.env.NODE_ENV === "production") notFound();

  const { q } = await searchParams;
  const consulta = q?.trim() || "leche entera";
  const resultados = await buscarEnFuentesExternas(consulta);

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-5 px-4 py-8">
      <div>
        <h1 className="text-hero-title text-2xl text-[var(--text-primary)]">
          Buscar — resultados reales
        </h1>
        <p className="mt-1 text-xs text-[var(--text-tertiary)]">
          «{consulta}» · {resultados.length} resultados ·{" "}
          {process.env.USDA_API_KEY ? "con USDA" : "sin clave de USDA (sólo Open Food Facts)"}
        </p>
      </div>

      {resultados.length === 0 ? (
        <p className="text-sm text-[var(--text-secondary)]">
          Ninguna fuente ha devuelto nada. Si Open Food Facts está caído, esto es exactamente lo
          que vería el usuario: la búsqueda no revienta, sólo se queda sin resultados de fuera.
        </p>
      ) : null}

      <ul className="surface-raised flex flex-col divide-y divide-[var(--border-soft)] overflow-hidden">
        {resultados.map(({ alimento: a, repetidos }) => (
          <li key={`${a.fuente}:${a.idExterno}`} className="px-4 py-3">
            <p className="text-sm font-medium text-[var(--text-primary)]">
              {a.nombre}
              {sufijoDeMarca(a.marca, repetidos)}
            </p>
            <p className="text-xs text-[var(--text-tertiary)]">
              {ETIQUETA_DE_MOTIVO[a.fuente]} · {formatKcal(a.energyKcal)}/100
              {a.basis === "per_100ml" ? "ml" : "g"}
              {a.servingSizeG ? ` · ración ${a.servingSizeG} g` : ""}
            </p>
            <div className="mt-1.5">
              <MacroInline protein={a.proteinG} carbs={a.carbohydratesG} fat={a.fatG} />
            </div>
            <NutrientPanel
              className="mt-2"
              nutrientes={{
                sugarsG: a.sugarsG,
                saturatedFatG: a.saturatedFatG,
                fiberG: a.fiberG,
                sodiumMg: a.sodiumMg,
                saltG: a.saltG,
                micronutrients: a.micronutrients,
              }}
            />
          </li>
        ))}
      </ul>
    </main>
  );
}
