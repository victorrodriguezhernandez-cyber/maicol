# Inteligencia artificial

## Principio (spec section 2)

AI never invents a nutrition number when a better source exists. The
hierarchy, most trustworthy first:

1. `nutrition_label` — a real, photographed nutrition label.
2. `open_food_facts` — barcode lookup.
3. `usda` — FoodData Central (schema/types are ready; no search UI wired
   yet — see "Not yet implemented" below).
4. `custom_food` — a food the user defined manually or from a label scan.
5. `recipe` — computed from known ingredients.
6. `manual` — the user typed the numbers directly.
7. `ai_photo_estimation` / `ai_text_estimation` / `ai_voice_estimation` —
   last resort, and always labeled as an estimate with a confidence and a
   probable range, never presented as exact.

Every `foods` and `meal_items` row carries its `source`; the UI's
"Alta/Media/Baja" precision badge (`ConfidenceBadge` in
`MealComposer.tsx`) is derived directly from it via
`maxPrecisionForSource()` (`src/lib/nutrition/types.ts`) — a photo
estimate can never claim "Alta" even if the model reports high
confidence, because the *source* caps what precision it's allowed to
claim.

## Model configuration

`GEMINI_MODEL` (env var, read via `serverConfig.geminiModel` on the
Next.js side and `Deno.env.get("GEMINI_MODEL")` in Edge Functions) is the
only place the concrete model name lives. Every call site asks for
"the configured model", never a hardcoded string. Swapping to a newer
Gemini Flash model (or a different model tier) is a one-line env var
change — see `.env.example`.

## Structured output contract

Every AI capture Edge Function follows the same shape
(`supabase/functions/_shared/gemini.ts#generateStructured`):

1. Call Gemini with `responseMimeType: "application/json"` and an explicit
   `responseSchema` (OpenAPI-subset JSON Schema) — the model is
   constrained to emit that shape.
2. Parse the returned text as JSON.
3. Validate it again with a Zod schema
   (`supabase/functions/_shared/schemas.ts`) before the function will
   return it to the client.

If step 3 fails, the function returns `{ error: "invalid_ai_response" }`
with HTTP 502 — the client never receives a malformed estimate. This is
deliberately double-enforced (schema at the API level *and* Zod
afterwards) because a `responseSchema` constrains the model's *attempt*,
not a guarantee about what actually comes back.

## Endpoints (Supabase Edge Functions)

| Function | Input | Output | Spec section |
|---|---|---|---|
| `analyze-meal-photo` | 1+ compressed photos (base64) + optional size reference | per-item estimate with quantity range + confidence, or `unable_to_estimate` + clarifying questions | 9, 10, 11, 61 |
| `analyze-label-photo` | 1 photo of a nutrition label | full nutrient set + detected `basis` (per 100g/100ml/serving) + `legible` flag | 13 |
| `analyze-text` | free-form Spanish text | same item shape as `analyze-meal-photo` | 14 |
| `analyze-voice` | audio (base64, sent directly to Gemini — no separate transcription step) | same item shape | 15 |
| `ai-coach` | `{ conversationId?, message }` | `{ conversationId, reply, proposedAction? }` | 32, 33, 34 |

Every function requires a valid user JWT (`verify_jwt: true`) and does all
its Supabase reads/writes through a client scoped to that JWT — never the
service role — so it can only ever see the calling user's own data.

## Coach IA tools

`ai-coach` declares 12 read-only tools plus one write-adjacent one, and
lets Gemini's function-calling decide which it needs per message (spec
section 32):

`get_current_goals`, `get_today_nutrition`, `get_day_nutrition`,
`calculate_remaining_macros`, `get_weight_trend`, `get_weight_history`,
`get_weekly_summary`, `get_nutrition_adherence`, `get_macro_history`,
`search_personal_foods`, `get_recent_meals`, `compare_periods`.

All 12 only ever `SELECT`. The 13th, `propose_goal_change`, is
deliberately **not** a database write — it returns its arguments as
`proposedAction` in the HTTP response; the Next.js client renders a
Confirm/Cancel UI (`ChatCoach.tsx`) and only calls `applyGoalChange`
(a normal Server Action, same one the manual goal editor uses) after the
user taps Confirm. The system instruction (`ai-coach/index.ts`) also
tells the model this explicitly. This is what spec section 33 means by
"no debe modificar silenciosamente" — there is no code path from a chat
message to a database write that skips the confirmation UI.

## Memory (spec section 34)

`ai_memory` exists (category `preference`/`meal_pattern`/`dislike`/
`config`/`goal_context`, unique per `(user_id, category, key)`) but no code
path writes to it yet — the coach currently reasons only from the
conversation history it's given (last 30 messages) plus whatever its tools
return. Wiring this up (the coach deciding "this is worth remembering" and
writing a structured key/value, then loading relevant memory into its
system context on future turns) is the natural next step for this feature,
deliberately scoped out of this V1 rather than half-implemented.

## Correction learning (spec section 39)

`ai_corrections` exists with the right shape
(`food_name`, `dish_context`, `original_estimate`, `corrected_value`) but
nothing writes to it yet — `MealComposer` lets a user edit any AI-estimated
item, but that edit isn't currently diffed against the original estimate
and persisted as a correction. The natural place to add this is
`createMeal`: compare each item's final values against the corresponding
`ai_analyses.structured_result` entry (already logged) before insert.

## Privacy (spec section 59)

- Meal/label photos and voice recordings are sent to Gemini **only** when
  the user explicitly initiates that capture flow.
- Progress photos (`/progreso/fotos`) are never sent anywhere but Supabase
  Storage — no code path passes them to an Edge Function or Gemini.
- Voice recordings are sent to Gemini in-memory (base64 in the request
  body) and are never written to Storage or logged; there is no "keep
  recording" option yet, so nothing persists them.
- The provider layer is isolated to
  `supabase/functions/_shared/gemini.ts` — replacing Gemini with another
  multimodal provider means rewriting that one file (and the
  `responseSchema` shapes it builds, if the new provider's structured-
  output contract differs), not touching any function's business logic.

## Not yet implemented (honest gaps, not silent placeholders)

- **USDA FoodData Central search**: `foods.source = 'usda'` and
  `external_id` exist in the schema and `USDA_API_KEY` is documented in
  `.env.example`, but no search UI or Edge Function calls that API yet.
  `search_personal_foods`/the `/registrar/buscar` flow currently only
  searches the user's own catalog + Open Food Facts (via barcode).
- **Correction learning loop** and **`ai_memory` writes** — see above.
- **Few-shot correction examples in prompts** (spec section 39's "en
  futuras estimaciones... proporcionar a Gemini ejemplos relevantes de mis
  correcciones anteriores") depends on the correction-learning loop above.
