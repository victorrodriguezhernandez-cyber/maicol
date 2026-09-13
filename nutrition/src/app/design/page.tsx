import { notFound } from "next/navigation";
import { MacroChip } from "@/components/ui/MacroChip";
import { RingProgress } from "@/components/ui/RingProgress";
import { AlertIcon, CheckIcon, TrendIcon } from "@/components/ui/icons";

/**
 * Living styleguide — development only (this route 404s in production and
 * the middleware does not let it through).
 *
 * It renders the app's REAL components with sample data, not invented
 * boxes. That distinction matters: an earlier version of this page used
 * made-up rectangles, and judging the design on it led to "fixing"
 * problems that only existed in the mock while changing things that were
 * already right in the actual screens.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-hero-title text-3xl text-[var(--text-primary)]">Sistema de diseño</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Componentes reales de la app. Todo sale de variables en <code>globals.css</code>.
        </p>
      </header>

      <Section title="Hoy — como se ve de verdad">
        <div className="surface-hero flex items-center justify-between p-5">
          <div className="flex flex-col gap-3">
            <span className="text-section">Calorías de hoy</span>
            <span className="text-display text-5xl text-[var(--text-primary)]">564</span>
            <span className="text-sm text-[var(--text-secondary)]">de 2.800 kcal</span>
            <span
              className="w-fit rounded-full px-3 py-1.5 text-xs font-semibold"
              style={{ background: "var(--accent-soft)", color: "var(--accent-2)" }}
            >
              2.236 kcal disponibles
            </span>
          </div>
          <RingProgress value={564} max={2800} size={92} strokeWidth={9} glow>
            <span className="text-metric text-sm text-[var(--text-primary)]">20%</span>
          </RingProgress>
        </div>

        <div className="surface-panel grid grid-cols-2 gap-4 p-4">
          <MacroChip label="Proteína" value={29} goal={140} color="var(--metric-protein)" />
          <MacroChip label="Carbos" value={58} goal={300} color="var(--metric-carbs)" />
          <MacroChip label="Grasas" value={25} goal={90} color="var(--metric-fat)" />
          <MacroChip label="Fibra" value={2} goal={30} color="var(--metric-fiber)" />
        </div>
      </Section>

      <Section title="Píldoras — la voz de botón nueva">
        <div className="flex flex-wrap gap-2">
          <button className="btn-pill">
            <TrendIcon size={14} /> Tutorial
          </button>
          <button className="btn-pill">Reemplazar</button>
          <button className="btn-pill" data-active="true">
            Notas
          </button>
        </div>
      </Section>

      <Section title="Serie de un ejercicio">
        {/* Prueba de la fila de serie del apartado de Entreno: la activa se
            resalta en azul y el check es el único elemento con color pleno. */}
        <div className="surface-soft overflow-hidden">
          <div className="grid grid-cols-[3rem_1fr_1fr_1fr_3rem] items-center gap-2 px-4 py-2.5">
            <span className="text-section">Serie</span>
            <span className="text-section">Previa</span>
            <span className="text-section">Kg</span>
            <span className="text-section">Repes</span>
            <span />
          </div>
          <SetRow serie={1} previa="8 × 10" kg={8} repes={10} hecha />
          <SetRow serie={2} previa="8 × 10" kg={8} repes={10} />
          <SetRow serie={3} previa="8 × 8" kg={10} repes={8} />
        </div>
      </Section>

      <Section title="Acciones">
        <div className="flex flex-col gap-2.5">
          <button className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]">
            Guardar comida
          </button>
          <button className="btn-secondary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--text-primary)]">
            Añadir alimento
          </button>
          <button className="btn-danger tap-scale rounded-xl py-3 text-sm font-semibold">
            Eliminar comida
          </button>
          <button
            className="btn-primary rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]"
            disabled
          >
            Deshabilitado
          </button>
        </div>
      </Section>

      <Section title="Superficies">
        <div className="flex flex-col gap-3">
          <div className="surface-soft p-4 text-sm text-[var(--text-secondary)]">surface-soft</div>
          <div className="surface-panel p-4 text-sm text-[var(--text-secondary)]">surface-panel</div>
          <div className="surface-raised p-4 text-sm text-[var(--text-secondary)]">surface-raised</div>
          <div className="surface-glass p-4 text-sm text-[var(--text-secondary)]">surface-glass</div>
        </div>
      </Section>

      <Section title="Texto y estado">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-[var(--text-primary)]">Primario — lo que se lee</p>
          <p className="text-sm text-[var(--text-secondary)]">Secundario — apoyo</p>
          <p className="text-sm text-[var(--text-tertiary)]">Terciario — al margen</p>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Pill label="Correcto" color="var(--success)" />
          <Pill label="Atención" color="var(--warning)" />
          <Pill label="Error" color="var(--danger)" />
          <Pill label="Acción" color="var(--accent)" />
        </div>
      </Section>
    </main>
  );
}

function SetRow({
  serie,
  previa,
  kg,
  repes,
  hecha = false,
}: {
  serie: number;
  previa: string;
  kg: number;
  repes: number;
  hecha?: boolean;
}) {
  return (
    <div
      className="grid grid-cols-[3rem_1fr_1fr_1fr_3rem] items-center gap-2 border-t border-[var(--border-soft)] px-4 py-3"
      style={hecha ? { background: "var(--accent-soft)" } : undefined}
    >
      <span className="text-metric text-sm text-[var(--text-primary)]">{serie}</span>
      <span className="text-metric text-sm text-[var(--text-tertiary)]">{previa}</span>
      <span className="text-metric text-base text-[var(--text-primary)]">{kg}</span>
      <span className="text-metric text-base text-[var(--text-primary)]">{repes}</span>
      <span
        className="flex h-8 w-8 items-center justify-center rounded-full"
        style={
          hecha
            ? { background: "var(--accent)", color: "var(--accent-fg)" }
            : { background: "var(--surface-2)", color: "var(--text-tertiary)" }
        }
      >
        <CheckIcon size={15} />
      </span>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3">
      <h2 className="text-section">{title}</h2>
      {children}
    </section>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      <AlertIcon size={12} />
      {label}
    </span>
  );
}
