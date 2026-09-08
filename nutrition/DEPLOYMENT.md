# Despliegue

## Ya provisionado en este proyecto

- **Supabase project**: `Maicol` (ref `pyiukqeuaxonsrrgbfzq`, region
  `eu-west-1`), shared with the unrelated trading app in this same repo
  (see `ARCHITECTURE.md`).
- **Schema + RLS + storage**: applied via `supabase/migrations/0001`–`0003`
  (see `DATABASE.md`).
- **Edge Functions**: `analyze-meal-photo`, `analyze-label-photo`,
  `analyze-text`, `analyze-voice`, `ai-coach` — all deployed
  (`verify_jwt: true`).

- **Vercel project**: `maicol-6vwk` (team `victorrh08-6041s-projects`),
  reused from a project already linked to this GitHub repo (see the
  "Two Vercel projects" note below) — **Root Directory** set to
  `nutrition`, **Framework Preset** set to `Next.js`, and
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY`/`GEMINI_MODEL`
  set as environment variables.

What's **not** done yet, because it needs secrets this environment doesn't
have: the `GEMINI_API_KEY` Supabase Function secret, and (optionally)
`SUPABASE_SERVICE_ROLE_KEY`/`USDA_API_KEY` as Vercel env vars. Steps below.

### Two Vercel projects linked to this repo

This repo already had **two** Vercel projects linked to it before this app
existed — `maicol` and `maicol-6vwk` — both created by earlier sessions
working on the trading app, both still building the repo root (the static
trading site) by default. `maicol` is the one with the clean production
domains (`maicol-six.vercel.app` etc.) and stays untouched, still serving
the trading site. `maicol-6vwk` was repurposed for this app (its Root
Directory changed to `nutrition`) since it had no exclusive live use.
If you ever need a third, separate Vercel project instead, create it
directly from the Vercel dashboard (Add New → Project) — the API used by
this session's tooling returns 403 when asked to create a *new* project
from scratch, so that step has to be done from the dashboard once.

## 1. Supabase secrets (required for AI features to work)

Edge Functions read secrets from the project's function environment, not
from `.env.local`. Set them once via the Supabase CLI (or Dashboard →
Edge Functions → Secrets):

```bash
supabase login
supabase link --project-ref pyiukqeuaxonsrrgbfzq

supabase secrets set GEMINI_API_KEY=your-real-key
supabase secrets set GEMINI_MODEL=gemini-3.6-flash   # optional, this is the default
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are already available to every Edge
Function automatically (Supabase injects them) — you don't need to set
those yourself.

Without `GEMINI_API_KEY` set, every AI capture flow degrades gracefully:
the client shows "La IA no está disponible ahora mismo" and offers a
manual-entry fallback (see `AI.md` → each Edge Function returns
`{ error: "ai_unavailable" }`, HTTP 503, rather than crashing).

## 2. Vercel project

Already done for `maicol-6vwk` (see above). For reference, this is what
was configured, in case you ever need to redo it for a new project:

- **Settings → General → Root Directory** → `nutrition` (required: this
  repo's root also contains the unrelated static trading site, so without
  this Vercel tries to build the repo root instead of the Next.js app).
- **Settings → General → Framework Preset** → `Next.js`, with no
  Output Directory override (an inherited "Other"/`dist` override from
  the trading site's static-export config causes the build to fail with
  `No Output Directory named "dist" found` otherwise).
- **Settings → Environment Variables** (Production + Preview +
  Development):
  - `NEXT_PUBLIC_SUPABASE_URL` = `https://pyiukqeuaxonsrrgbfzq.supabase.co`
  - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = the publishable key from Supabase
    Dashboard → Settings → API (safe to expose to the browser)
  - `GEMINI_MODEL` = `gemini-3.6-flash`
  - Optional: `SUPABASE_SERVICE_ROLE_KEY` (the **secret** service-role key
    from that same API settings page — never put it in `NEXT_PUBLIC_*`).
    Without it, barcode/label scans fall back to caching the food as a
    private copy instead of the shared catalog — see
    `src/lib/data/foods-write.ts`.
  - Optional: `USDA_API_KEY`, `OPEN_FOOD_FACTS_USER_AGENT` — see `AI.md`.
- Git integration: connected to `victorrodriguezhernandez-cyber/maicol`,
  `main` as the production branch — this is what "la rama principal debe
  desplegar producción" (spec section 66) refers to. Every push to `main`
  auto-deploys to production; other branches/PRs get preview deployments.

## 3. Supabase Auth email template (optional but recommended)

The default Supabase magic-link email works out of the box. To customize
it: Supabase Dashboard → Authentication → Email Templates → Magic Link.
Make sure the redirect URL allowlist (Authentication → URL Configuration)
includes your Vercel production domain plus
`https://<domain>/auth/callback`.

## 4. Verifying the deployment

1. Visit the deployed URL on an iPhone in Safari, tap Share → "Add to Home
   Screen".
2. Open it from the home screen icon (standalone mode) and sign in via
   magic link.
3. Complete onboarding, log a meal manually, log a weight entry.
4. If `GEMINI_API_KEY` is set: try a photo or text capture and confirm you
   get a real structured estimate back.
5. `curl -I https://<domain>/manifest.webmanifest` should return 200 with
   `content-type: application/manifest+json` (or `application/json`,
   depending on how the host serves it) — confirms the PWA manifest is
   reachable.

## Local development

```bash
npm install
cp .env.example .env.local
npm run dev
```

`npm run dev` runs on Turbopack with the PWA disabled (see the note in
`README.md`). AI capture flows will hit the *real* deployed Edge Functions
(they're already live on the Supabase project), so local dev can exercise
them as long as `GEMINI_API_KEY` is set as a Supabase secret (step 1) —
`.env.local` doesn't need it, since the Edge Function reads it from
Supabase's own secret store regardless of where the Next.js app runs.

## CI

None configured yet. The recommended minimal pipeline (not present in
this repo) would run, per push/PR: `npm run lint`, `npm run test`,
`npm run build`. There is no existing CI config in this repository to
extend.
