"use client";

import { db } from "./db";
import { createMeal } from "@/lib/actions/meals";

let syncing = false;

/**
 * Flushes any meals that were queued while offline. Safe to call
 * repeatedly (e.g. on every 'online' event and on app mount) — it's a
 * no-op when the queue is empty, and each entry is removed only after a
 * successful write, so a flush that gets interrupted just retries later
 * instead of duplicating or losing anything.
 */
export async function flushPendingMeals(): Promise<{ synced: number; failed: number }> {
  if (syncing) return { synced: 0, failed: 0 };
  syncing = true;
  let synced = 0;
  let failed = 0;
  try {
    const pending = await db.pendingMeals.toArray();
    for (const item of pending) {
      try {
        await createMeal(item.input);
        await db.pendingMeals.delete(item.clientId);
        synced++;
      } catch {
        // Still offline, or a transient server error — leave it queued
        // and try again on the next flush.
        failed++;
      }
    }
  } finally {
    syncing = false;
  }
  return { synced, failed };
}

export async function queueMealOffline(clientId: string, input: Parameters<typeof createMeal>[0]) {
  await db.pendingMeals.put({ clientId, input, createdAt: new Date().toISOString() });
}

export async function countPendingMeals(): Promise<number> {
  return db.pendingMeals.count();
}
