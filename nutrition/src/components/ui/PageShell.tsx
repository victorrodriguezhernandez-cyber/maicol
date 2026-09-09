/**
 * The shared page frame for every screen behind the bottom nav — max
 * width, horizontal rhythm, and vertical gap between sections in one
 * place, so no screen invents its own spacing scale. `eyebrow` is the
 * small date/context line above the title (see Hoy/Progreso/Diario);
 * `title` is the one `.text-hero-title` per screen; `trailing` is an
 * optional right-aligned slot (a segmented control, an action button).
 */
export function PageShell({
  eyebrow,
  title,
  trailing,
  children,
}: {
  eyebrow?: React.ReactNode;
  title?: React.ReactNode;
  trailing?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-7 pb-6">
      {title ? (
        <div className="flex items-end justify-between gap-3">
          <div className="flex flex-col gap-1">
            {eyebrow ? <p className="text-meta">{eyebrow}</p> : null}
            <h1 className="text-hero-title text-[1.75rem] text-[var(--text-primary)]">
              {title}
            </h1>
          </div>
          {trailing ? <div className="shrink-0 pb-0.5">{trailing}</div> : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
