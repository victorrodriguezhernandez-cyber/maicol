/**
 * Central place to read environment configuration. Nothing else in the
 * codebase should reach into `process.env` directly — this keeps every
 * required variable documented in one spot and keeps the concrete Gemini
 * model name out of call sites (section 5 of the spec: swapping models
 * must never require touching application code).
 */

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(
      `Missing required environment variable: ${name}. See .env.example.`,
    );
  }
  return value;
}

export const publicConfig = {
  supabaseUrl: required(
    "NEXT_PUBLIC_SUPABASE_URL",
    process.env.NEXT_PUBLIC_SUPABASE_URL,
  ),
  supabaseAnonKey: required(
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  ),
};

/** Server-only configuration. Importing this from client code is a bug. */
export const serverConfig = {
  get supabaseServiceRoleKey(): string | undefined {
    return process.env.SUPABASE_SERVICE_ROLE_KEY;
  },
  get geminiApiKey(): string | undefined {
    return process.env.GEMINI_API_KEY;
  },
  get geminiModel(): string {
    return process.env.GEMINI_MODEL ?? "gemini-2.5-flash";
  },
  get usdaApiKey(): string | undefined {
    return process.env.USDA_API_KEY;
  },
  get openFoodFactsUserAgent(): string {
    return (
      process.env.OPEN_FOOD_FACTS_USER_AGENT ??
      "MaicolNutrition/1.0 (unset contact)"
    );
  },
};
