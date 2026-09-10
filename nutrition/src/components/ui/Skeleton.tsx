/**
 * Loading-state building block. Server Components fetch live data (auth
 * check + DB reads) before they can render anything, so a route change
 * has real network latency in the middle of it — without a `loading.tsx`
 * per route, that latency shows up as the previous screen just sitting
 * there frozen, which reads as "colgada" rather than "cargando". Each
 * screen's `loading.tsx` renders a shape-matched skeleton with this
 * primitive so the transition feels immediate even while data is still
 * in flight.
 */
export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`animate-pulse rounded-xl bg-[var(--surface-2)] ${className}`} />;
}
