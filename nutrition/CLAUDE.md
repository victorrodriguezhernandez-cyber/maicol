# CLAUDE.md — guía para futuras sesiones de Claude Code

This file is scoped to `nutrition/`, which is the only project in this
repository. A trading static site used to live at the repo root; its files
were removed in September 2026 (they are still in the Git history). Its
Supabase tables were NOT removed — see "Antes de tocar la base de datos".

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
4. **La IA nunca escribe directamente en la base de datos.** Cualquier
   tool `propose_*` de `ai-coach` (ver `buildAction()`) solo devuelve una
   propuesta tipada `{ kind, risk, summary, payload }`; el Edge Function
   nunca tiene una vía de escritura propia. La app (`ChatCoach.tsx`)
   ejecuta la propuesta llamando siempre a la misma Server Action
   validada que usaría el resto de la app (`createMeal`, `deleteMeal`,
   `setWeightEntryForDate`, `applyGoalChange`...) — nunca un
   `insert`/`update` improvisado en el cliente. Registrar comida pasa por
   `propose_add_meal`, que devuelve la comida DESGLOSADA ingrediente a
   ingrediente con la forma exacta de `CreateMealInput`: un plato entero
   en una sola línea con los macros sumados no se puede comprobar ni
   corregir, y por eso la herramienta de "un alimento suelto" ya no
   existe (un alimento es una lista de uno). Lo que varía por
   `risk` es solo *cuándo* se ejecuta, no *si* pasa por esa validación:
   `risk: "safe"` (añadir un alimento, duplicar una comida, corregir un
   peso) se ejecuta en cuanto llega, mostrando después una tarjeta
   "✅ hecho" con "Deshacer"; `risk: "destructive"` (borrar una comida,
   cambiar el objetivo) pide confirmación explícita antes de ejecutar
   nada. Si añades una nueva tool `propose_*`, decide su `risk` con el
   mismo criterio y dale una vía de deshacer real en `executeAction()`
   (no prometas "Deshacer" si no puedes cumplirlo). Para acciones sobre un
   registro ya existente (borrar/duplicar una comida), `buildAction()`
   busca esa fila en la base de datos él mismo (nunca confía en lo que el
   modelo diga que contiene) — así un argumento alucinado como mucho no
   encuentra nada, nunca actúa sobre datos inventados.
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
8. **El email de la cuenta nunca vuelve al cliente.** El login se ejecuta
   en una Server Action (`src/app/(auth)/login/actions.ts`) leyendo
   `serverConfig.accountEmail`. Estuvo incrustado en el componente cliente
   y acabó en el bundle público; como el "Usuario" ES la contraseña, eso
   regalaba medio credencial. Hay un test E2E que falla si reaparece.
9. **Toda etiqueta de juicio se puede justificar.** Si una pantalla dice
   "volumen alto", "por debajo del mínimo" o cualquier valoración
   parecida, tiene que poder explicarse: el número exacto, el rango con
   el que se compara, de dónde sale ese rango y su margen de error. Ver
   `explainVolume()` en `src/lib/training/volume.ts` y el test que
   recorre los 17 músculos exigiendo que ninguna etiqueta se quede sin
   explicación. Una etiqueta que no se puede defender no debería existir
   — y ese es el criterio para cualquier indicador nuevo, no sólo para
   los de entreno.
10. **En entreno, la IA tampoco inventa.** `build-routine` recibe el
   catálogo real y sólo puede devolver nombres que estén en él; al
   volver, cada nombre se resuelve contra ese mismo catálogo y lo que no
   coincide va a `unmatched` y se le enseña al usuario, nunca se
   sustituye por algo parecido. La función devuelve una PROPUESTA y no
   escribe nada: guardar pasa siempre por `createRoutine`, la misma
   Server Action validada que usa el editor manual, que vuelve a
   comprobar que cada id existe. Es la regla 4 aplicada al entreno.
11. **No hay datos ni respuestas de IA simuladas.** Si vas a añadir una
   funcionalidad que "aparenta" funcionar (un botón que no hace nada real,
   un array hardcoded haciendo de base de datos), no la añadas — o la
   implementas de verdad, o la dejas fuera y lo documentas en el README
   como "no implementado todavía" (sección 69 de la especificación
   original, y ver la lista de huecos honestos en `README.md`/`AI.md`).

12. **La carga que toca hoy la decide un algoritmo, no la IA.**
   `src/lib/training/progression.ts` es doble progresión pura: el peso no
   sube hasta llegar al tope del rango en TODAS las series, y sube el
   salto mínimo que permita el material. Es un algoritmo y no una llamada
   a Gemini porque es instantáneo, gratis, da siempre la misma respuesta
   con los mismos datos, funciona desde el primer entreno y se puede
   justificar con el número exacto del que sale (regla 9: cada
   `Recomendacion` trae su `detalle`). La IA sólo narra por encima. Si
   tocas ese archivo, toca también su copia
   `supabase/functions/_shared/progresion.ts` — existe porque los Edge
   Functions no pueden importar de `src/` (regla 3), y
   `progression.paridad.test.ts` falla si divergen. Que el coach dé un
   número distinto del que enseña la pantalla del entreno es peor que no
   responder.

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
npm run test:e2e       # Playwright — levanta un build de producción y lo prueba
npx tsc --noEmit -p tsconfig.json
npx eslint .
```

Los E2E necesitan un build previo (`npm run build`). En un entorno donde
el navegador instalado no coincida con el que espera `@playwright/test`,
pásale la ruta: `CHROMIUM_PATH=/ruta/a/chrome npm run test:e2e`.
Corren sobre Chromium con viewport de iPhone; **no** cubren bugs
específicos de Safari (ver el comentario en `playwright.config.ts`).

`npm run build` y `npx eslint .` generan/pueden tocar
`public/sw.js`/`public/workbox-*.js`/`public/*.js.map` — están en
`.gitignore` y excluidos de ESLint a propósito (son artefactos de build,
no código fuente). Bórralos con
`rm -f public/sw.js public/swe-worker-*.js public/workbox-*.js public/worker-*.js public/fallback-*.js public/*.js.map`
si te estorban durante el desarrollo.

## Qué NO está implementado todavía (no lo des por hecho)

Del apartado de entreno: no hay descanso automático entre ejercicios
distintos (sólo entre series), no hay gráfica de progresión de carga por
ejercicio (sólo el historial en lista y las barras semanales por músculo),
y el cronómetro de descanso **no suena ni vibra** — `navigator.vibrate` no
existe en Safari de iOS y el audio automático está bloqueado, así que un
aviso que falla la mitad de las veces sería peor que ninguno (ver el
comentario en `RestTimer.tsx`).

La búsqueda de alimentos SÍ sale ya a fuentes externas: Open Food Facts
(productos envasados, sin clave) y USDA FoodData Central (alimentos
genéricos, apagada hasta que exista `USDA_API_KEY`). Las dos pasan por
`src/lib/data/external-foods.ts`, y **toda conversión de unidades vive en
`src/lib/nutrition/nutrientes-externos.ts`, que descarta lo que no sabe
interpretar en vez de suponer** — Open Food Facts da el sodio en gramos y
la columna es `sodium_mg`, así que una suposición ahí es un error de mil
veces que nadie ve. Si añades una tercera fuente, su mapeo va en
`external-mapping.ts` y se prueba contra una respuesta REAL capturada en
`__fixtures__`, no contra un objeto escrito a mano (regla 11).

Ver la lista completa en `README.md` y `AI.md`. Resumen: bucle de
aprendizaje de correcciones (`ai_corrections`), memoria estructurada del
coach (`ai_memory`), adjuntar fotos de comida guardadas a `meal_images`,
notificaciones push reales, sincronización con Apple Health (imposible
desde una PWA).
