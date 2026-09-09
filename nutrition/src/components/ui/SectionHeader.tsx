/** The small uppercase label above a group of content ("Comidas de hoy",
 * "Objetivos"), with an optional trailing action/link — replaces every
 * screen hand-rolling its own section-title markup. */
export function SectionHeader({
  children,
  action,
}: {
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-section">{children}</p>
      {action ? <div>{action}</div> : null}
    </div>
  );
}
