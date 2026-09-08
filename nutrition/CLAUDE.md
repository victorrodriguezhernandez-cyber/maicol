# CLAUDE.md — guía para futuras sesiones de Claude Code

This file is scoped to `nutrition/` (the actual app). The repository root
also contains an unrelated trading-platform static site — don't touch
`index.html`/`chart.js`/`zones.js`/`supabase.js`/`el_sensei_espanol.pine`
at the repo root unless the user is explicitly asking about that other
project.

@AGENTS.md

## Reglas del proyecto (no negociables)

1. **La IA nunca inventa un dato nutricional cuando existe una fuente
   mejor.** Ver la jerarquía en `AI.md`. Cualquier código nuevo que cree o
   modifique un `foods`/`meal_items` row debe fijar `source` y
   `precision_level` correctamente — usa `maxPrecisionForSource()` en
   `src/lib/nutrition/types.ts`, no inventes una nueva forma de decidirlo.
2. **Nunca redondear internamente.** Los cálculos de macros/kcal deben
   operar en punto flotante completo; solo se redondea al mostrar
   (`roundForDisplay`). Si tocas `src/lib/nutrition/*`, corre
   `npm run test` — hay fixtures exactos (400 kcal/100g × 75g = 300 kcal,
   etc.) que no deben romperse.
3. **La tendencia de peso nunca es "hoy menos ayer".** Es un EWMA de
   tiempo continuo (`computeWeightTrend` en `src/lib/nutrition/trend.ts`,
   documentado ahí). Todo lo que muestre "cómo va mi peso" — dashboard,
   `/progreso`, el check adaptativo, la tool `get_weight_trend` del coach —
   debe leer de esa misma función (o de la copia deliberadamente duplicada
   en `supabase/functions/_shared/trend.ts`, que existe porque los Edge
   Functions son un deployable Deno separado y no pueden `import` desde
   `src/`).
4. **La IA nunca escribe silenciosamente.** `propose_goal_change` en
   `ai-coach` solo devuelve una propuesta; la aplicación real pasa siempre
   por `applyGoalChange` (Server Action) tras confirmación explícita del
   usuario. Si añades una nueva tool que "podría cambiar algo", que
   proponga, nunca que escriba.
5. **Ningún secreto en el cliente.** `SUPABASE_SERVICE_ROLE_KEY` y
   `GEMINI_API_KEY` solo se leen server-side (`src/lib/config.ts`
   `serverConfig`, o `Deno.env.get(...)` en Edge Functions). Si necesitas
   una de estas claves en un componente marcado `"use client"`, estás
   haciendo algo mal — mueve esa lógica a un Server Action, Route Handler,
   o Edge Function.
6. **Snapshots, no referencias, en el diario.** `meal_items` congela los
   valores nutricionales en el momento de guardar (sección 52 de la
   especificación original). Editar un `food`/`recipe` después nunca debe
   reescribir comidas ya registradas — si añades una función de "editar
   alimento", que no toque `meal_items` existentes.
7. **El historial de objetivos nunca se sobrescribe.** `nutrition_goals`
   es su propio historial vía `effective_from`/`effective_to` (sección 51).
   Usa `applyGoalChange` para cualquier cambio de objetivo; no hagas
   `UPDATE` directo sobre la fila abierta salvo que sea exactamente ese
   patrón de cerrar-y-abrir.
8. **No hay datos ni respuestas de IA simuladas.** Si vas a añadir una
   funcionalidad que "aparenta" funcionar (un botón que no hace nada real,
   un array hardcoded haciendo de base de datos), no la añadas — o la
   implementas de verdad, o la dejas fuera y lo documentas en el README
   como "no implementado todavía" (sección 69 de la especificación
   original, y ver la lista de huecos honestos en `README.md`/`AI.md`).

## Antes de tocar la base de datos

Lee `DATABASE.md`. Aplica migraciones nuevas con el MCP/CLI de Supabase
contra el proyecto `pyiukqeuaxonsrrgbfzq` (ref), nunca a mano desde el
dashboard sin dejar constancia en `supabase/migrations/`. Corre
`get_advisors` (security) después de cualquier migración nueva y arregla
lo que tu migración haya introducido — pero no toques `zonas_historial`/
`niveles_historial`/`analisis_actual` (pertenecen a la otra app que
comparte este proyecto Supabase; ver `ARCHITECTURE.md`).

## Antes de desplegar un Edge Function nuevo

Los Edge Functions son Deno, no Node — no pueden importar nada de `src/`.
Comparten código vía `supabase/functions/_shared/`, con imports relativos
`../_shared/archivo.ts` (así están en disco); al desplegar vía
`deploy_edge_function` (MCP), sube los shared files con `name` igual a
`../_shared/archivo.ts` (así resuelven exactamente esos imports). Cada
función que llame a Gemini debe:

1. Definir su `responseSchema` (JSON Schema) en `_shared/schemas.ts`.
2. Validar la respuesta parseada con el Zod schema correspondiente antes
   de devolverla.
3. Manejar `GeminiUnavailableError` devolviendo
   `{ error: "ai_unavailable" }` con status 503 — nunca dejar que la
   función caiga en un 500 genérico cuando simplemente falta la API key.

## Comandos útiles

```bash
npm run dev          # Turbopack, PWA desactivada
npm run build         # --webpack (necesario por @ducanh2912/next-pwa, ver README)
npm run test           # Vitest — corre esto tras tocar src/lib/nutrition/*
npx tsc --noEmit -p tsconfig.json
npx eslint .
```

`npm run build` y `npx eslint .` generan/pueden tocar
`public/sw.js`/`public/workbox-*.js`/`public/*.js.map` — están en
`.gitignore` y excluidos de ESLint a propósito (son artefactos de build,
no código fuente). Bórralos con
`rm -f public/sw.js public/swe-worker-*.js public/workbox-*.js public/worker-*.js public/fallback-*.js public/*.js.map`
si te estorban durante el desarrollo.

## Qué NO está implementado todavía (no lo des por hecho)

Ver la lista completa en `README.md` y `AI.md`. Resumen: búsqueda USDA,
bucle de aprendizaje de correcciones (`ai_corrections`), memoria
estructurada del coach (`ai_memory`), adjuntar fotos de comida guardadas a
`meal_images`, notificaciones push reales, sincronización con Apple
Health (imposible desde una PWA).
