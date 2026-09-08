import "server-only";
import { serverConfig } from "@/lib/config";

/**
 * Open Food Facts product shape, trimmed to the fields we actually use.
 * https://openfoodfacts.github.io/openfoodfacts-server/api/
 */
interface OffProduct {
  product_name?: string;
  brands?: string;
  image_front_url?: string;
  quantity?: string;
  serving_size?: string;
  nutriments?: Record<string, number | string | undefined>;
}

export interface NormalizedOffFood {
  name: string;
  brand: string | null;
  imageUrl: string | null;
  servingLabel: string | null;
  basis: "per_100g" | "per_100ml";
  energyKcal: number;
  proteinG: number;
  carbohydratesG: number;
  sugarsG: number | null;
  fatG: number;
  saturatedFatG: number | null;
  fiberG: number | null;
  sodiumMg: number | null;
  saltG: number | null;
}

export type BarcodeLookupResult =
  | { status: "found"; food: NormalizedOffFood }
  | { status: "not_found" }
  | { status: "unavailable"; reason: string };

function toNumber(value: unknown): number | null {
  if (typeof value === "number") return value;
  if (typeof value === "string" && value.trim() !== "") return Number(value);
  return null;
}

export async function lookupBarcode(barcode: string): Promise<BarcodeLookupResult> {
  let response: Response;
  try {
    response = await fetch(
      `https://world.openfoodfacts.org/api/v2/product/${encodeURIComponent(barcode)}.json`,
      {
        headers: { "User-Agent": serverConfig.openFoodFactsUserAgent },
        // Open Food Facts data changes rarely; a short cache keeps repeated
        // scans of the same product fast without going stale for long.
        next: { revalidate: 60 * 60 },
      },
    );
  } catch (e) {
    return { status: "unavailable", reason: e instanceof Error ? e.message : "network_error" };
  }

  if (response.status === 404) return { status: "not_found" };
  if (!response.ok) return { status: "unavailable", reason: `http_${response.status}` };

  const data = (await response.json()) as { status: number; product?: OffProduct };
  if (data.status !== 1 || !data.product) return { status: "not_found" };

  const p = data.product;
  const n = p.nutriments ?? {};
  const energyKcal = toNumber(n["energy-kcal_100g"]) ?? toNumber(n["energy-kcal"]);
  if (!p.product_name || energyKcal == null) return { status: "not_found" };

  return {
    status: "found",
    food: {
      name: p.product_name,
      brand: p.brands ?? null,
      imageUrl: p.image_front_url ?? null,
      servingLabel: p.serving_size ?? null,
      basis: "per_100g",
      energyKcal,
      proteinG: toNumber(n["proteins_100g"]) ?? 0,
      carbohydratesG: toNumber(n["carbohydrates_100g"]) ?? 0,
      sugarsG: toNumber(n["sugars_100g"]),
      fatG: toNumber(n["fat_100g"]) ?? 0,
      saturatedFatG: toNumber(n["saturated-fat_100g"]),
      fiberG: toNumber(n["fiber_100g"]),
      sodiumMg: toNumber(n["sodium_100g"]) != null ? toNumber(n["sodium_100g"])! * 1000 : null,
      saltG: toNumber(n["salt_100g"]),
    },
  };
}
