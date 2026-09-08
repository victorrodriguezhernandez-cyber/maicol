"use client";

import { useEffect, useState } from "react";
import { flushPendingMeals, countPendingMeals } from "@/lib/offline/sync";

/** Mounted once in the authenticated app shell: flushes the offline meal
 * queue on load and whenever connectivity returns, and shows a small,
 * unobtrusive badge while items are still waiting to sync. */
export function OfflineSyncBoundary() {
  const [pending, setPending] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function refresh() {
      const count = await countPendingMeals();
      if (!cancelled) setPending(count);
    }

    async function trySync() {
      if (!navigator.onLine) return;
      await flushPendingMeals();
      await refresh();
    }

    refresh();
    trySync();
    window.addEventListener("online", trySync);
    return () => {
      cancelled = true;
      window.removeEventListener("online", trySync);
    };
  }, []);

  if (pending === 0) return null;

  return (
    <div className="fixed left-1/2 top-[calc(env(safe-area-inset-top)+8px)] z-50 -translate-x-1/2 rounded-full bg-[var(--warning)] px-3 py-1 text-[11px] font-medium text-white shadow">
      {pending} comida{pending === 1 ? "" : "s"} pendiente{pending === 1 ? "" : "s"} de sincronizar
    </div>
  );
}
