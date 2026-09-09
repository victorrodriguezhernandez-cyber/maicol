# Flujos críticos — no romper esto

Este documento existe para un agente que hereda el proyecto y no tiene el
contexto de las decisiones ya tomadas. Son los mismos ocho principios de
`CLAUDE.md` ("Reglas del proyecto (no negociables)"), pero aquí con el
código exacto que los implementa, para que un cambio no los rompa sin
querer. Si vas a tocar cualquiera de estos archivos, lee la sección
correspondiente primero.

## 1. Jerarquía de origen del dato nutricional

**Regla**: la IA nunca inventa un número cuando existe una fuente mejor,
y la etiqueta de confianza que ve el usuario nunca puede mentir sobre lo
fiable que es un dato.

- Jerarquía completa en `AI.md`: `nutrition_label` > `usda` > `custom_food`
  > `recipe` > `manual` > `ai_photo_estimation`/`ai_text_estimation`/
  `ai_voice_estimation`.
- `src/lib/nutrition/types.ts` → `maxPrecisionForSource()` es la ÚNICA
  función que decide qué `precision_level` puede declarar un `source`. No
  dupliques esta lógica en otro sitio.
- `src/lib/actions/meals.ts` → `createMeal` vuelve a clamped cada item con
  esta misma función antes de insertar — nunca confía en lo que el
  cliente afirma que es la precisión, aunque el cliente ya debería haberlo
  calculado bien.
- `src/lib/nutrition/estimate-quality.ts` → `estimateQuality()` es lo que
  pinta el badge "Alta/Media-alta/Media/Baja" en `MealComposer.tsx` y
  `MealItemRow.tsx`. Si añades un nuevo `source`, decide su tier aquí, no
  con un `if` suelto en un componente.

**Cómo se rompe sin querer**: crear un nuevo flujo de captura que escriba
`meal_items` sin pasar por `createMeal`, o que invente un
`precision_level` "a mano" en el cliente en vez de dejar que
`maxPrecisionForSource()` lo decida.

## 2. Nunca redondear internamente

**Regla**: todo cálculo de macros/kcal opera en punto flotante completo;
el redondeo (`roundForDisplay`, `src/lib/nutrition/units.ts`) pasa
exactamente una vez, justo antes de pintar un número en pantalla.

- `src/lib/nutrition/*.ts` tiene fixtures exactos en sus `*.test.ts`
  (p.ej. 400 kcal/100g × 75g = 300 kcal exacto). `npm run test` debe
  seguir en 34/34 tras tocar cualquier archivo de `src/lib/nutrition/`.
- **Cómo se rompe sin querer**: usar `Math.round()` en medio de una suma
  de macros (p.ej. en `sumMealItems`/`sumMeals`, `src/lib/data/nutrition.ts`)
  en vez de solo al formatear con `formatKcal`/`formatGrams`.

## 3. Tendencia de peso = EWMA, nunca "hoy menos ayer"

**Regla**: cualquier pantalla que diga "cómo va tu peso" lee la misma
función, un EWMA de tiempo continuo — nunca una resta entre dos pesajes.

- Implementación canónica: `src/lib/nutrition/trend.ts` →
  `computeWeightTrend()` + `computeWeeklyRate()` (regresión OLS sobre la
  ventana final de la tendencia, no un delta de dos puntos).
- Copia deliberadamente duplicada (Edge Functions no pueden `import` de
  `src/`): `supabase/functions/_shared/trend.ts` → `computeTrend()` +
  `weeklyRate()`. Mismo algoritmo, nombres distintos porque es un archivo
  Deno independiente.
- Consumidores que DEBEN usar una de las dos: Hoy (`(app)/page.tsx`),
  `/progreso`, el check adaptativo (`src/lib/nutrition/adaptive-goal.ts`),
  y la tool `get_weight_trend` del coach (`ai-coach/index.ts`).
- **Cómo se rompe sin querer**: añadir una pantalla nueva que calcule
  "diferencia entre el último pesaje y el anterior" para mostrar una
  flecha de progreso — parece inocente y es exactamente el error que esta
  regla existe para prevenir (el peso diario fluctúa varios cientos de
  gramos por agua/comida; solo la tendencia es una señal real).

## 4. La IA nunca escribe directamente en la base de datos

**Regla**: toda escritura que el Coach IA "hace de verdad" pasa por una
`propose_*` tool → una propuesta tipada `{ kind, risk, summary, payload }`
→ el cliente ejecuta la MISMA Server Action que usaría cualquier otra
parte de la app.

- `supabase/functions/ai-coach/index.ts` → `buildAction()` es el único
  sitio que construye una `ActionProposal`. No tiene ninguna vía de
  escritura a Postgres propia — cada tool de lectura (`runTool()`) usa el
  cliente de Supabase con el JWT del usuario (RLS aplicado), nunca la
  service-role key.
- `src/components/coach/ChatCoach.tsx` → `executeAction()` es el único
  sitio del cliente que ejecuta una propuesta, y siempre llamando a
  `createMeal`/`deleteMeal`/`addMealItemForDate`/`setWeightEntryForDate`/
  `applyGoalChange` — las mismas Server Actions que usan los formularios
  normales de la app.
- `risk: "safe"` (`add_meal_item`, `update_weight_entry`,
  `duplicate_meal`) se ejecuta en cuanto llega, con un "Deshacer" real
  guardado en `lastExecuted.undo`. `risk: "destructive"` (`delete_meal`,
  `goal_change`) exige confirmación explícita del usuario antes de
  ejecutar nada.
- Para acciones sobre un registro existente (borrar/duplicar una comida),
  `buildAction()` busca esa fila él mismo en la base de datos — nunca
  confía en lo que el modelo dice que contiene esa fila. Un `meal_id`
  alucinado como mucho falla en encontrarse, nunca actúa sobre datos
  inventados.
- **Cómo se rompe sin querer**: añadir una tool `propose_*` nueva que
  llame a `supabase.from(...).insert(...)` directamente desde el Edge
  Function en vez de devolver una propuesta — o ejecutarla en el cliente
  con un `insert` improvisado en vez de la Server Action existente.

## 5. Ningún secreto en el cliente

- `SUPABASE_SERVICE_ROLE_KEY` y `GEMINI_API_KEY` solo se leen server-side:
  `src/lib/config.ts` (`serverConfig`, nunca `publicConfig`) en Next.js, o
  `Deno.env.get(...)` dentro de un Edge Function.
- El cliente del navegador (`src/lib/supabase/client.ts`) solo conoce
  `NEXT_PUBLIC_SUPABASE_URL`/`NEXT_PUBLIC_SUPABASE_ANON_KEY` — ambas
  seguras de exponer porque cada tabla que alcanzan está protegida por
  RLS (ver `DATABASE.md`).
- `SUPABASE_SERVICE_ROLE_KEY` **no está configurada en ningún entorno
  actualmente** (ni Vercel ni local) — su único consumidor histórico
  (`src/lib/data/foods-write.ts`, el caché del catálogo compartido para
  el escáner de código de barras) se eliminó junto con esa función. La
  infraestructura (`src/lib/supabase/admin.ts`) queda lista para la
  próxima función que sí necesite escribir con esa key.
- **Cómo se rompe sin querer**: importar `serverConfig` o
  `src/lib/supabase/admin.ts` desde un archivo marcado `"use client"`, o
  desde cualquier componente que Next.js pueda incluir en el bundle del
  navegador.

## 6. Snapshots, no referencias, en el diario

- `meal_items` congela los valores nutricionales en el momento de
  guardar (`createMeal`, `src/lib/actions/meals.ts`). Editar un
  `food`/`recipe` después NUNCA debe reescribir comidas ya registradas.
- Esto es también lo que hace seguro `propose_duplicate_meal`/
  `propose_delete_meal`: la "snapshot" que fetchea `buildAction()`
  (`toMealSnapshot()`) es exactamente lo que hace falta para poder
  recrear la comida vía `createMeal(snapshot)` — deshacer un borrado o
  duplicar una comida es siempre "vuelve a crear esta snapshot exacta",
  nunca una referencia al `food_id` original (que pudo haber cambiado).
- **Cómo se rompe sin querer**: añadir un "editar alimento" que haga
  `UPDATE foods SET ... WHERE id = ...` y esperar que eso actualice
  también las comidas ya registradas con ese alimento — no debe hacerlo.

## 7. El historial de objetivos nunca se sobrescribe

- `nutrition_goals` es su propio historial vía `effective_from`/
  `effective_to` — un índice parcial único garantiza como mucho una fila
  con `effective_to IS NULL` (el objetivo "actual") por usuario.
- `src/lib/actions/goals.ts` → `applyGoalChange()` es la ÚNICA función que
  debe tocar esta tabla: cierra la fila abierta (`effective_to = ayer`) y
  abre una nueva. Nunca hagas `UPDATE nutrition_goals SET kcal = ...`
  sobre la fila abierta directamente — eso destruye el historial que
  `/progreso` y el check adaptativo necesitan para saber qué objetivo
  regía en cada fecha pasada.

## 8. Auth: una cuenta fija, sin email visible

Ver `ARCHITECTURE.md` → Auth y `DEPLOYMENT.md` §3 para el detalle
completo. Resumen operativo:

- Una única cuenta Supabase Auth, email fijo (`ACCOUNT_EMAIL` en
  `src/app/(auth)/login/page.tsx`), nunca mostrado al usuario.
- El campo "Usuario" que teclea el usuario ES la contraseña de esa cuenta
  (`signInWithPassword`). No hay magic link, no hay email de
  verificación, no hay "olvidé mi contraseña".
- Cambiar el "usuario" (Ajustes → Seguridad,
  `src/components/settings/SetPasswordForm.tsx`) es
  `supabase.auth.updateUser({ password })` con sesión ya activa — sigue
  sin tocar email en ningún momento.
- **Si necesitas resetear la contraseña sin acceso a la app** (p. ej.
  cuenta bloqueada): no hay flujo de API sin `SUPABASE_SERVICE_ROLE_KEY`
  (no configurada, ver regla 5) — la única vía verificada es SQL directo
  contra `auth.users` usando `pgcrypto`:
  ```sql
  update auth.users
  set encrypted_password = extensions.crypt('nueva-palabra', extensions.gen_salt('bf')),
      updated_at = now()
  where email = 'el-email-fijo-de-ACCOUNT_EMAIL';
  ```
  Esto es exactamente el esquema bcrypt que usa GoTrue (Supabase Auth)
  internamente — verificado en este proyecto probando
  `POST /auth/v1/token?grant_type=password` contra la API real tras el
  cambio.

## 9. Huso horario: todo en Europe/Madrid, nunca en el reloj del servidor

No es una de las 8 reglas originales de `CLAUDE.md`, pero es igual de
fácil de romper sin querer y ya causó bugs reales en este proyecto —
merece estar aquí.

- Vercel (y la mayoría de runtimes serverless) ejecuta en UTC. Cualquier
  `new Date().getHours()`/slice crudo de un ISO string en un Server
  Component o Edge Function calcula en UTC, no en la hora real del
  usuario.
- La fuente de verdad en Next.js: `src/lib/format.ts` — `APP_TIMEZONE =
  "Europe/Madrid"`, y todo pasa por `formatTime`/`formatDateTimeShort`/
  `toLocalDateKey`/`todayLocalDateString`/`localHour`/`localDayBoundsUtc`.
  Nunca uses `.getHours()`, `.getDay()`, o `.slice(0, 10)` sobre un ISO
  string directamente en código server-side — usa una de estas funciones.
- Copia duplicada para el Edge Function `ai-coach` (no puede `import` de
  `src/`): `supabase/functions/_shared/date.ts` — mismas funciones,
  mismo criterio.
- **Cómo se rompe sin querer**: escribir `new Date().getHours()` o
  `date.toISOString().slice(0, 10)` en cualquier código nuevo que corra
  en el servidor — funciona en local (donde tu reloj y el del navegador
  coinciden) y falla en producción de forma sutil (una comida registrada
  a las 23:30 aparece en el día equivocado, un saludo dice "buenas
  noches" a mediodía).

## 10. Offline: nunca perder una comida que se está registrando

- `src/lib/offline/db.ts` (Dexie/IndexedDB, tabla `pendingMeals`) +
  `src/lib/offline/sync.ts` (`queueMealOffline`/`flushPendingMeals`/
  `countPendingMeals`) + `src/components/offline/OfflineSyncBoundary.tsx`
  (montado en el layout raíz) — si `createMeal` falla por falta de red,
  la entrada se guarda localmente y se reintenta sola en el siguiente
  evento `online` o carga de la app.
- Esto solo cubre la entrada **manual** (`/registrar/manual`, el único
  flujo que llega a `MealComposer` sin haber hecho ya una llamada de red
  a un Edge Function primero) — los flujos de IA (foto/etiqueta/texto/voz)
  necesitan red sí o sí para la propia estimación, así que no tiene
  sentido intentar encolarlos.
- `src/app/~offline/page.tsx` es la página de fallback del service worker
  (`@ducanh2912/next-pwa` la detecta automáticamente por su ruta) —
  sin comprobación de auth, porque no puede llamar a
  `supabase.auth.getUser()` sin red.
- **Cómo se rompe sin querer**: añadir un nuevo campo obligatorio a
  `CreateMealInput` sin actualizar el tipo en `src/lib/offline/db.ts`
  (`PendingMeal.input: CreateMealInput`) — TypeScript debería avisar, pero
  revisa igualmente que `flushPendingMeals` siga mandando el payload
  completo.
