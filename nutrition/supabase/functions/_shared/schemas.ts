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

/* =========================================================================
   Rutinas de entreno propuestas por la IA
   =========================================================================

   La regla que gobierna todo esto: el modelo NO inventa ejercicios. Se le
   manda el catálogo real y sólo puede devolver nombres que estén en él.
   Lo que no encaje va a `unmatched` y se le enseña al usuario en vez de
   colarse en la rutina — es el mismo criterio que la regla 1 del proyecto
   ("la IA nunca inventa un dato cuando existe una fuente mejor") aplicado
   a los ejercicios.

   Y como esto es una PROPUESTA, nada se escribe aquí: la app la enseña,
   el usuario la acepta, y entonces se llama a la misma Server Action
   validada que usa el editor manual (regla 4). */

export const routineExerciseProposalSchema = z.object({
  exercise_name: z.string(),
  sets: z.number().int().min(1).max(20),
  reps_min: z.number().int().min(1).max(100),
  reps_max: z.number().int().min(1).max(100),
  rir: z.number().min(0).max(10).nullable(),
  rest_seconds: z.number().int().min(0).max(900),
  notes: z.string().nullable(),
});

export const routineDayProposalSchema = z.object({
  name: z.string(),
  notes: z.string().nullable(),
  exercises: z.array(routineExerciseProposalSchema).max(30),
});

export const routineProposalSchema = z.object({
  name: z.string(),
  goal: z.enum(["fuerza", "hipertrofia", "resistencia", "mantenimiento"]),
  notes: z.string().nullable(),
  /** Por qué esta estructura y no otra. Se enseña al usuario tal cual. */
  rationale: z.string(),
  days: z.array(routineDayProposalSchema).min(1).max(7),
  /** Ejercicios que quiso incluir y no están en el catálogo. */
  unmatched: z.array(z.string()),
  /** Avisos honestos: lo que no ha podido deducir o le preocupa. */
  warnings: z.array(z.string()),
});
export type RoutineProposal = z.infer<typeof routineProposalSchema>;

export const routineProposalJsonSchema = {
  type: "object",
  properties: {
    name: { type: "string" },
    goal: {
      type: "string",
      enum: ["fuerza", "hipertrofia", "resistencia", "mantenimiento"],
    },
    notes: { type: "string", nullable: true },
    rationale: { type: "string" },
    days: {
      type: "array",
      items: {
        type: "object",
        properties: {
          name: { type: "string" },
          notes: { type: "string", nullable: true },
          exercises: {
            type: "array",
            items: {
              type: "object",
              properties: {
                exercise_name: { type: "string" },
                sets: { type: "integer" },
                reps_min: { type: "integer" },
                reps_max: { type: "integer" },
                rir: { type: "number", nullable: true },
                rest_seconds: { type: "integer" },
                notes: { type: "string", nullable: true },
              },
              required: [
                "exercise_name", "sets", "reps_min", "reps_max",
                "rir", "rest_seconds", "notes",
              ],
            },
          },
        },
        required: ["name", "notes", "exercises"],
      },
    },
    unmatched: { type: "array", items: { type: "string" } },
    warnings: { type: "array", items: { type: "string" } },
  },
  required: ["name", "goal", "notes", "rationale", "days", "unmatched", "warnings"],
};
