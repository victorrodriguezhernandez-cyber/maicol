import Dexie, { type EntityTable } from "dexie";
import type { CreateMealInput } from "@/lib/actions/meals";

/**
 * Section 45: the app shell, recent history and goals are cached by the
 * PWA service worker; this IndexedDB queue is the other half — it lets a
 * meal be *created* while offline. AI capture obviously still needs a
 * connection (Gemini can't run on-device), but manual/search/barcode
 * entries queue here and flush automatically once the network is back.
 */
export interface PendingMeal {
  clientId: string;
  input: CreateMealInput;
  createdAt: string;
}

const db = new Dexie("maicol-offline") as Dexie & {
  pendingMeals: EntityTable<PendingMeal, "clientId">;
};

db.version(1).stores({
  pendingMeals: "clientId, createdAt",
});

export { db };
