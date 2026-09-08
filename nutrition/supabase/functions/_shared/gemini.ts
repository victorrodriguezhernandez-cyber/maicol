// Thin Gemini wrapper for Edge Functions. The concrete model name is read
// from the GEMINI_MODEL secret (falls back to a default) so it can be
// swapped without touching any function's code — section 5 of the spec.
import { GoogleGenAI } from "npm:@google/genai@^1.0.0";

export function getGeminiModel(): string {
  return Deno.env.get("GEMINI_MODEL") ?? "gemini-2.5-flash";
}

function getClient(): GoogleGenAI {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) {
    throw new GeminiUnavailableError("GEMINI_API_KEY is not configured");
  }
  return new GoogleGenAI({ apiKey });
}

export class GeminiUnavailableError extends Error {}

export interface StructuredGenerationInput {
  systemInstruction: string;
  parts: Array<
    | { text: string }
    | { inlineData: { mimeType: string; data: string } }
  >;
  // OpenAPI-subset JSON Schema, per Gemini's responseSchema contract.
  responseSchema: Record<string, unknown>;
}

/**
 * Requests JSON structured output (never free-form text we'd have to
 * parse ourselves — section 5: "nunca depender de parsing improvisado").
 * The caller is still expected to validate the parsed JSON against a Zod
 * schema before trusting it; this only constrains what the model *tries*
 * to produce.
 */
export async function generateStructured({
  systemInstruction,
  parts,
  responseSchema,
}: StructuredGenerationInput): Promise<unknown> {
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: getGeminiModel(),
    contents: [{ role: "user", parts }],
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema,
    },
  });

  const text = response.text;
  if (!text) throw new Error("Gemini returned an empty response");
  return JSON.parse(text);
}
