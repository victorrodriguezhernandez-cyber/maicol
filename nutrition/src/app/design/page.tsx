import { notFound } from "next/navigation";

/**
 * Living styleguide — every token and primitive on one screen.
 *
 * Two jobs:
 * 1. It is how the design gets reviewed. The rest of the app sits behind
 *    auth, so without this there is no way to look at the system as a
 *    system — only one screen at a time, with real data in the way.
 * 2. It is the map for changing it later. Every colour here is a CSS
 *    custom property from globals.css; if a swatch looks wrong, the fix
 *    is that one variable, and it propagates everywhere.
 *
 * Development only. In production this route does not exist — it is not
 * behind a password, it simply 404s, so there is nothing to protect.
 */
export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <main className="mx-auto flex w-full max-w-lg flex-col gap-10 px-4 py-10">
      <header className="flex flex-col gap-2">
        <h1 className="text-hero-title text-3xl text-[var(--text-primary)]">Sistema de diseño</h1>
        <p className="text-sm text-[var(--text-secondary)]">
          Todo lo que ves aquí sale de variables en <code>globals.css</code>. Cambia una y cambia
          toda la app.
        </p>
      </header>

      <Section title="El número es el héroe">
        <div className="surface-hero flex items-end justify-between p-6">
          <div className="flex flex-col gap-2">
            <span className="text-meta">Hoy</span>
            <span className="text-display text-6xl text-[var(--text-primary)]">1 847</span>
            <span className="text-sm text-[var(--text-secondary)]">de 2 400 kcal</span>
          </div>
          <div className="flex flex-col items-end gap-1">
            <span className="text-metric text-lg text-[var(--metric-weight)]">64,2 kg</span>
            <span className="text-meta">+0,18 kg/sem</span>
          </div>
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

      <Section title="Acciones">
        <div className="flex flex-col gap-2.5">
          <button className="btn-primary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--accent-fg)]">
            Guardar comida
          </button>
          <button className="btn-secondary tap-scale rounded-xl py-3 text-sm font-semibold text-[var(--text-primary)]">
            Añadir alimento
          </button>
          <button className="btn-ghost tap-scale rounded-xl py-3 text-sm font-semibold">
            Cancelar
          </button>
          <button className="btn-danger tap-scale rounded-xl py-3 text-sm font-semibold">
            Eliminar comida
          </button>
        </div>
      </Section>

      <Section title="Un color por métrica (nunca el lima)">
        <div className="grid grid-cols-2 gap-3">
          <Metric name="Proteína" value="142 g" token="protein" />
          <Metric name="Carbohidratos" value="210 g" token="carbs" />
          <Metric name="Grasas" value="68 g" token="fat" />
          <Metric name="Fibra" value="31 g" token="fiber" />
          <Metric name="Peso" value="64,2 kg" token="weight" />
        </div>
      </Section>

      <Section title="Escala tipográfica">
        <div className="flex flex-col gap-3">
          <p className="text-display text-4xl text-[var(--text-primary)]">2 400</p>
          <p className="text-hero-title text-2xl text-[var(--text-primary)]">Progreso</p>
          <p className="text-section">Comidas de hoy</p>
          <p className="text-metric text-base text-[var(--text-primary)]">75 g · 300 kcal</p>
          <p className="text-sm text-[var(--text-primary)]">Texto normal de la interfaz.</p>
          <p className="text-meta">Hace 2 horas</p>
        </div>
      </Section>

      <Section title="Texto">
        <div className="flex flex-col gap-1.5">
          <p className="text-sm text-[var(--text-primary)]">Primario — lo que se lee</p>
          <p className="text-sm text-[var(--text-secondary)]">Secundario — apoyo</p>
          <p className="text-sm text-[var(--text-tertiary)]">Terciario — al margen</p>
        </div>
      </Section>

      <Section title="Estado">
        <div className="flex flex-wrap gap-2">
          <Pill label="Correcto" color="var(--success)" />
          <Pill label="Atención" color="var(--warning)" />
          <Pill label="Error" color="var(--danger)" />
          <Pill label="Acción" color="var(--accent)" />
        </div>
      </Section>
    </main>
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

function Metric({ name, value, token }: { name: string; value: string; token: string }) {
  return (
    <div className="surface-soft flex flex-col gap-1.5 p-3.5">
      <span className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)]">
        <i
          className="h-2 w-2 rounded-full"
          style={{ background: `var(--metric-${token})` }}
          aria-hidden
        />
        {name}
      </span>
      <span className="text-metric text-lg" style={{ color: `var(--metric-${token})` }}>
        {value}
      </span>
      <span
        className="h-[5px] w-full overflow-hidden rounded-full"
        style={{ background: `var(--metric-${token}-soft)` }}
      >
        <i className="block h-full w-2/3 rounded-full" style={{ background: `var(--metric-${token})` }} />
      </span>
    </div>
  );
}

function Pill({ label, color }: { label: string; color: string }) {
  return (
    <span
      className="rounded-full px-3 py-1.5 text-xs font-semibold"
      style={{ background: `color-mix(in srgb, ${color} 14%, transparent)`, color }}
    >
      {label}
    </span>
  );
}
