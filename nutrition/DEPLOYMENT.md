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

What's **not** done yet, because it needs secrets this environment doesn't
have: the `GEMINI_API_KEY`/`SUPABASE_SERVICE_ROLE_KEY`/`USDA_API_KEY`
Supabase Function secrets, and the Vercel project + its env vars. Steps
below.

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

```bash
cd nutrition
npx vercel link      # creates/links a Vercel project for this directory
npx vercel env add NEXT_PUBLIC_SUPABASE_URL production
npx vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY production
npx vercel env add SUPABASE_SERVICE_ROLE_KEY production
npx vercel env add GEMINI_MODEL production
npx vercel env add USDA_API_KEY production          # optional, see AI.md
npx vercel env add OPEN_FOOD_FACTS_USER_AGENT production
```

Values for the first two: see the Supabase dashboard → Settings → API for
project `pyiukqeuaxonsrrgbfzq` (`Project URL` and the `anon`/publishable
key) — the same values are in this session's `.env.local` (not committed).
`SUPABASE_SERVICE_ROLE_KEY` is the **secret** service-role key from that
same page — never put it in `NEXT_PUBLIC_*`, and never commit it.

Repeat for the `preview` and `development` environments if you want PR
previews to work fully (they'll still build and run without
`SUPABASE_SERVICE_ROLE_KEY`; barcode scans will just fall back to caching
the food as a private copy instead of the shared catalog — see
`src/lib/data/foods-write.ts`).

Then either:

```bash
npx vercel --prod
```

or connect the GitHub repo in the Vercel dashboard (Project → Settings →
Git) so `main` auto-deploys to production and other branches/PRs get
preview deployments — this is the recommended long-term setup and is what
"la rama principal debe desplegar producción" (spec section 66) refers to.

Because this repository's root also contains an unrelated static site (the
trading app), when connecting via the Vercel dashboard set the project's
**Root Directory** to `nutrition/` so Vercel builds this app, not the
repo root.

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
