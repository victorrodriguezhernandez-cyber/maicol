import { z } from "npm:zod@^4.0.0";

/**
 * Every AI capture endpoint returns this shape. `unable_to_estimate` lets
 * the model refuse rather than invent numbers (section 61) — in that case
 * `items` is empty and `clarifying_questions` guides what to ask the user
 * instead of silently completing the form.
 */
export const foodEstimateItemSchema = z.object({
  name: z.string(),
  preparation: z.string().nullable(),
  estimated_quantity: z.number().positive(),
  quantity_unit: z.string(),
  range_min: z.number().nonnegative(),
  range_max: z.number().nonnegative(),
  confidence: z.enum(["high", "medium", "low"]),
  contains_oil: z.boolean(),
  contains_sauce: z.boolean(),
  notes: z.string().nullable(),
  energy_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbohydrates_g: z.number().nonnegative(),
  fat_g: z.number().nonnegative(),
  fiber_g: z.number().nonnegative().nullable(),
});

export const mealEstimateResponseSchema = z.object({
  items: z.array(foodEstimateItemSchema),
  overall_confidence: z.enum(["high", "medium", "low"]),
  unable_to_estimate: z.boolean(),
  clarifying_questions: z.array(z.string()),
});
export type MealEstimateResponse = z.infer<typeof mealEstimateResponseSchema>;

export const mealEstimateJsonSchema = {
  type: "object",
  properties: {
    items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          preparation: { type: "string", nullable: true },
          estimated_quantity: { type: "number" },
          quantity_unit: { type: "string" },
          range_min: { type: "number" },
          range_max: { type: "number" },
          confidence: { type: "string", enum: ["high", "medium", "low"] },
          contains_oil: { type: "boolean" },
          contains_sauce: { type: "boolean" },
          notes: { type: "string", nullable: true },
          energy_kcal: { type: "number" },
          protein_g: { type: "number" },
          carbohydrates_g: { type: "number" },
          fat_g: { type: "number" },
          fiber_g: { type: "number", nullable: true },
        },
        required: [
          "name", "preparation", "estimated_quantity", "quantity_unit",
          "range_min", "range_max", "confidence", "contains_oil",
          "contains_sauce", "notes", "energy_kcal", "protein_g",
          "carbohydrates_g", "fat_g", "fiber_g",
        ],
      },
    },
    overall_confidence: { type: "string", enum: ["high", "medium", "low"] },
    unable_to_estimate: { type: "boolean" },
    clarifying_questions: { type: "array", items: { type: "string" } },
  },
  required: ["items", "overall_confidence", "unable_to_estimate", "clarifying_questions"],
};

export const labelEstimateSchema = z.object({
  name: z.string().nullable(),
  brand: z.string().nullable(),
  basis: z.enum(["per_100g", "per_100ml", "per_serving"]),
  serving_size_g: z.number().nullable(),
  serving_label: z.string().nullable(),
  energy_kcal: z.number().nonnegative(),
  protein_g: z.number().nonnegative(),
  carbohydrates_g: z.number().nonnegative(),
  sugars_g: z.number().nonnegative().nullable(),
  fat_g: z.number().nonnegative(),
  saturated_fat_g: z.number().nonnegative().nullable(),
  fiber_g: z.number().nonnegative().nullable(),
  sodium_mg: z.number().nonnegative().nullable(),
  salt_g: z.number().nonnegative().nullable(),
  legible: z.boolean(),
});
export type LabelEstimate = z.infer<typeof labelEstimateSchema>;

export const labelJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string", nullable: true },
    brand: { type: "string", nullable: true },
    basis: { type: "string", enum: ["per_100g", "per_100ml", "per_serving"] },
    serving_size_g: { type: "number", nullable: true },
    serving_label: { type: "string", nullable: true },
    energy_kcal: { type: "number" },
    protein_g: { type: "number" },
    carbohydrates_g: { type: "number" },
    sugars_g: { type: "number", nullable: true },
    fat_g: { type: "number" },
    saturated_fat_g: { type: "number", nullable: true },
    fiber_g: { type: "number", nullable: true },
    sodium_mg: { type: "number", nullable: true },
    salt_g: { type: "number", nullable: true },
    legible: { type: "boolean" },
  },
  required: [
    "name", "brand", "basis", "serving_size_g", "serving_label", "energy_kcal",
    "protein_g", "carbohydrates_g", "sugars_g", "fat_g", "saturated_fat_g",
    "fiber_g", "sodium_mg", "salt_g", "legible",
  ],
};
