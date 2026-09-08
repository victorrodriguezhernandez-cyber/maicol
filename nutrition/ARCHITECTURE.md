# Arquitectura

## Panorama general

```
┌─────────────────────────┐        ┌──────────────────────────────┐
│   iPhone (Safari PWA)    │        │           Vercel              │
│                          │◄──────►│  Next.js App Router (RSC +    │
│  service worker (shell,  │  HTTPS │  Route Handlers + Server      │
│  offline cache)          │        │  Actions)                     │
└─────────────────────────┘        └───────────────┬───────────────┘
                                                     │ anon key + cookie session
                                                     │ (RLS enforced)
                                    ┌────────────────▼───────────────┐
                                    │           Supabase              │
                                    │  Postgres (RLS) · Auth · Storage│
                                    │  Edge Functions (Deno)          │
                                    └────────────────┬────────────────┘
                                                     │ GEMINI_API_KEY (server-only secret)
                                    ┌────────────────▼────────────────┐
                                    │        Gemini API (Google)      │
                                    └──────────────────────────────────┘
```

Everything that needs a secret (Gemini, the Supabase service-role key, USDA)
runs server-side — either a Next.js Server Action/Route Handler, or a
Supabase Edge Function. The browser only ever holds the Supabase
**publishable/anon** key, which is safe to expose because every table it can
reach is protected by Row Level Security (see `DATABASE.md`).

## Frontend (`src/`)

- **App Router route groups**:
  - `(auth)` — `/login`, `/auth/callback` (magic-link landing). No bottom
    nav, no auth required.
  - `(app)` — everything behind the bottom navigation (`/`, `/diario`,
    `/progreso`, `/ia`, `/recetas`, `/ajustes`). `src/app/(app)/layout.tsx`
    redirects to `/login` server-side if there's no session.
  - `registrar/*` — the capture flows opened from the "Registrar" bottom
    sheet (manual, search, photo, label, text, voice, recipe,
    favorites). These are full routes (so browser back/forward and deep
    links work) but render with their own minimal header, not the main app
    chrome — closer to a modal than a tab.
  - `onboarding` — first-run profile + goal setup.
- **`src/lib/nutrition/*`** is the pure, dependency-free calculation core:
  unit conversion, macro scaling, recipe aggregation, the weight-trend
  EWMA, the TDEE/adaptive-maintenance formulas, and the adaptive-goal
  check. Every one of these has unit tests with known fixtures (see
  `npm run test`) — this is the code that must never silently drift.
- **`src/lib/data/*`** are read helpers that run against the RLS-scoped
  server client — one function per "shape of query the UI needs" (today's
  meals, a day's macro totals, weight history, food search, recipe
  totals…). Server Components call these directly.
- **`src/lib/actions/*`** are `"use server"` Server Actions — the only way
  the client ever writes to the database (besides direct Storage uploads,
  which are still RLS-checked). Each one validates its input with Zod
  before touching Postgres.
- **`src/components/register/MealComposer.tsx`** is the single shared
  "review before you save" screen (section 9 of the spec): every capture
  flow — photo, label, text, voice, manual, search, recipe —
  converges on it. Nothing is ever written to `meals`/`meal_items` before
  the user has seen and can edit it.

## Backend (Supabase)

- **Postgres + RLS**: see `DATABASE.md` for the full schema. Every
  personal table has `user_id` and an RLS policy scoping all access to
  `auth.uid() = user_id`; the shared food catalog (`foods` with
  `user_id IS NULL`) is readable by everyone and writable only by
  server-side code holding the service-role key.
- **Auth**: Supabase email OTP ("magic link"), no password. See
  `src/app/(auth)/login/page.tsx` and `.../auth/callback/route.ts`.
- **Storage**: three private buckets — `meal-images`, `progress-images`,
  `optional-documents` — each with an RLS policy on `storage.objects`
  restricting access to the caller's own `<user_id>/…` folder. The app
  only ever renders these through short-lived signed URLs.
- **Edge Functions** (`supabase/functions/*`, Deno runtime): the AI capture
  endpoints (`analyze-meal-photo`, `analyze-label-photo`, `analyze-text`,
  `analyze-voice`) and the coach (`ai-coach`). Each verifies the caller's
  JWT and does all its Supabase reads/writes through a client scoped to
  that JWT (never the service role) — so a bug in a function can't leak
  another user's data. `supabase/functions/_shared/` holds the code they
  share (CORS, auth, the Gemini wrapper, response schemas, and a small
  duplicate of the weight-trend algorithm used only by `ai-coach`'s tools —
  duplicated rather than imported because Edge Functions are a separate
  Deno deployable from the Next.js app; see the comment at the top of
  `_shared/trend.ts`).

## AI provider layer

`supabase/functions/_shared/gemini.ts` is the only place that talks to the
Gemini SDK. Every capture function calls `generateStructured()`, which
always requests `responseMimeType: "application/json"` with an explicit
JSON Schema (`responseSchema`) — never free-form text that the app then
tries to parse (spec section 5). The parsed JSON is *also* validated
against a Zod schema (`_shared/schemas.ts`) before the function will return
it, so a malformed or partially-wrong model response fails loudly
(`invalid_ai_response`, HTTP 502) instead of silently corrupting a diary
entry.

Swapping providers later means rewriting `_shared/gemini.ts` (and possibly
the request/response shape it returns) — no function needs to change how
it calls it. The model name itself is never hardcoded: it comes from the
`GEMINI_MODEL` secret, read once in `getGeminiModel()`.

## Data flow: registering a meal

1. Client collects raw input (photo/text/audio/manual fields).
2. For AI paths: client compresses images (`src/lib/image.ts`) or records
   audio, then calls the relevant Edge Function via
   `supabase.functions.invoke(...)` (JWT forwarded automatically).
3. Edge Function validates auth, calls Gemini with a JSON Schema, validates
   the result with Zod, logs it to `ai_analyses` (for future learning /
   corrections), and returns it. Nothing is written to the diary yet.
4. Client renders the result in `MealComposer` — editable, deletable,
   addable items, each carrying its `source`/`precision_level`/`confidence`
   /range.
5. On save, `createMeal` (Server Action) validates everything again with
   Zod, clamps each item's claimed precision to what its `source` is
   actually allowed to claim (see `clampPrecision` in
   `src/lib/actions/meals.ts`), inserts `meals` + `meal_items` (a full
   nutrient *snapshot*, not a reference — section 52), and updates
   `user_food_stats` so frequency/usual-quantity learning improves the
   next search (section 20).
6. If the save fails while offline, the composer queues the same payload
   in IndexedDB (`src/lib/offline/db.ts`) instead of losing it; a small
   sync boundary mounted in the root layout flushes the queue on the next
   `online` event or app load (section 45, section 60 — "never lose the
   entry being made").

## Weight trend

Documented in full in `src/lib/nutrition/trend.ts`: a continuous-time EWMA
(exponentially weighted moving average) over the daily-averaged weigh-ins,
with the smoothing driven by elapsed days rather than a fixed per-entry
alpha — which is what makes it correct for irregular weigh-ins (daily, or
every 2–4 days). The weekly rate of change is an OLS regression over the
trend line's trailing window, not a two-point delta. Dashboard, `/progreso`,
the adaptive-goal check, and the coach's `get_weight_trend` tool all read
this same function — there is exactly one weight-trend implementation in
the Next.js app (plus one small, intentionally duplicated copy inside the
`ai-coach` Edge Function, which is a separate Deno deployable and can't
`import` from `src/`).

## Adaptive calories

`src/lib/nutrition/tdee.ts` and `adaptive-goal.ts`: an initial
Mifflin-St-Jeor estimate at onboarding, superseded once there's 10+ days of
data by `computeAdaptiveMaintenance`, which backs out an implied maintenance
level from logged intake and the *trend* weight change over the window
(never a raw scale reading). Confidence is explicit
(`high`/`medium`/`low`/`insufficient_data`) and gates whether the `/ia` tab
even shows a suggestion — "not enough data yet" beats a confident-sounding
wrong number (spec section 28). Any change is proposed, never applied
automatically; the user must tap "Aplicar" (or confirm the coach's
proposal), which calls `applyGoalChange` and preserves history via
`effective_from`/`effective_to` (section 51).

## PWA specifics

- `public/manifest.webmanifest`, `src/app/layout.tsx` metadata
  (`appleWebApp`, icons, `viewport-fit: cover`), and `.safe-top`/
  `.safe-bottom`/`.safe-x` utility classes in `globals.css` handle the
  iPhone notch/Dynamic Island/home-indicator safe areas.
- `@ducanh2912/next-pwa` generates the service worker at build time
  (`next.config.ts`); it's disabled in `next dev` on purpose (PWA caching
  during development just gets in the way).
- Theme: `:root`/`[data-theme]`/`prefers-color-scheme` tokens in
  `globals.css`, applied before paint by a tiny inline script in
  `layout.tsx` that reads `localStorage.theme` (the source of truth is
  `user_preferences.theme` in Postgres; the settings page keeps both in
  sync).

## Apple Health

This is a PWA; there is no HealthKit bridge available to a website, so none
is simulated. `src/lib/nutrition/*` and `src/lib/data/*` are written as
plain, UI-agnostic functions specifically so that a future native
app/wrapper could reuse this business logic and add a real HealthKit
integration without rewriting it.

## Shared Supabase project

The Supabase project backing this app (`Maicol`, ref
`pyiukqeuaxonsrrgbfzq`) also hosts tables for an unrelated trading
dashboard (`zonas_historial`, `niveles_historial`, `analisis_actual`,
`zones_history`) that predates this app and lives in the repository root
(`index.html`, `chart.js`, `zones.js` — a static site, not part of this
Next.js project). This app's migrations (`supabase/migrations/`) only ever
create or alter objects under the table names listed in `DATABASE.md`; they
never touch that other app's tables. Three of those pre-existing tables
(`zonas_historial`, `niveles_historial`, `analisis_actual`) currently have
RLS disabled — a pre-existing condition unrelated to this app, intentionally
left alone (enabling RLS on a table with no policies would silently break
whatever public dashboard reads them; that's a decision for whoever owns
that app, not this one).
