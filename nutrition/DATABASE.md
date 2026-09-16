# Base de datos

Postgres schema `public` on the shared Supabase project `Maicol`
(`pyiukqeuaxonsrrgbfzq`). Canonical source: `supabase/migrations/`. This
document explains the *why*; the migrations are the ground truth for exact
types/constraints.

## Conventions

- Every personal table has `user_id uuid references auth.users(id)` and
  Row Level Security restricting all access to `auth.uid() = user_id`
  (`recipe_items`, `meal_items`, `meal_images`, `ai_messages` are scoped
  indirectly, through their parent's `user_id`, since they have no
  `user_id` column of their own).
- Nothing in this schema is ever written by the browser using the
  service-role key. The only rows with `user_id IS NULL` (the shared food
  catalog) are written by server code — Route Handlers/Edge Functions —
  using that key, which bypasses RLS entirely and must never be shipped to
  the client.
- Money/measurement fields use `numeric`, not `float`, and business logic
  keeps full precision until the moment a number is *displayed*
  (`roundForDisplay` in `src/lib/nutrition/units.ts`) — see section 63 of
  the spec and the fixture tests in `src/lib/nutrition/*.test.ts`.

## Tables

| Table | Purpose | Notes |
|---|---|---|
| `profiles` | 1:1 with `auth.users` | created by the `handle_new_user` trigger on signup |
| `user_preferences` | theme/units/language/meal labels/notifications | 1:1, created alongside `profiles` |
| `nutrition_goals` | current **and historical** goals | doubles as its own history via `effective_from`/`effective_to` — a unique partial index enforces at most one row with `effective_to IS NULL` per user (the "current" goal) |
| `weight_entries` | raw weigh-ins | `is_usual_conditions` flags whether the standard weigh-in protocol was followed, without invalidating other entries |
| `body_measurements` | waist/chest/arm/thigh/hip/neck/custom | `measurement_type` + `value_cm`, `custom_label` used only when type is `custom` |
| `progress_photos` | metadata only | actual files live in the private `progress-images` bucket; never sent to Gemini |
| `foods` | the unified, normalized food catalog | `user_id IS NULL` ⇒ shared/global (USDA, a scanned label); `user_id` set ⇒ private custom food. `basis` says whether the macro columns are per 100 g, per 100 ml, or per declared serving. `source = 'open_food_facts'` rows may still exist from the barcode scanner (removed — see ARCHITECTURE.md) but nothing creates new ones |
| `recipes` / `recipe_items` | user recipes | `recipe_items.grams_equivalent` is what actually gets scaled — `quantity_amount`/`quantity_unit` are just the display unit |
| `meals` / `meal_items` / `meal_images` | the diary | `meal_items` stores a full nutrient **snapshot** at log time (`precision_level`, `source`, `confidence`, `range_kcal_min/max`) so editing a food/recipe later never rewrites history (section 52) |
| `favorites` | quick access to a food or recipe | exactly one of `food_id`/`recipe_id` per row (CHECK constraint) |
| `user_food_stats` | frequency/usual-quantity learning | one row per `(user_id, food_id)`, updated on every `createMeal` |
| `day_logs` | explicit day completeness | `complete`/`partial`/`not_logged` — lets the adaptive-goal check ignore days you know you under-logged (section 53) |
| `training_sessions` | una sesión de entreno | dejó de ser un hueco reservado en `0005`: ahora es LA sesión, con estado (`en_curso`/`completada`/`abandonada`), rutina de origen, esfuerzo percibido y el peso corporal de ese día. Un índice parcial garantiza como mucho una sesión `en_curso` por usuario |
| `exercises` | catálogo de ejercicios | mismo patrón que `foods`: `user_id IS NULL` ⇒ catálogo compartido (129 filas sembradas en `0006`), `user_id` puesto ⇒ ejercicio propio. `secondary_muscles` es lo que hace que una serie cuente media para cada músculo de apoyo |
| `routines` / `routine_days` / `routine_exercises` | el plan | guardan el OBJETIVO (series, rango de reps, RIR, descanso), nunca el resultado. Un índice parcial único garantiza como mucho una rutina activa por usuario |
| `training_goals` | qué persigue entrenando | hasta 3 focos EN ORDEN (el primero manda) más un campo libre. Es su propio historial como `nutrition_goals`, con el mismo índice parcial único de un solo objetivo abierto. La dirección del peso (subir/bajar/mantener) NO se duplica aquí: vive en `nutrition_goals.mode` |
| `workout_sets` | la serie | el dato real de todo el apartado. `completed_at` es lo que convierte una serie planificada en un hecho: sin él no cuenta para volumen, ni récords, ni historial |
| `ai_analyses` | raw structured result of every AI capture call | one row per photo/label/text/voice analysis, whether or not the user ends up saving it (`accepted`) |
| `ai_corrections` | learning signal | records `(food_name, dish_context, original_estimate, corrected_value)` when a user edits an AI estimate — not yet fed back into prompts as few-shot examples (see the "Not yet implemented" list in `AI.md`) |
| `ai_conversations` / `ai_messages` | Coach IA chat history | `ai_messages.tool_calls` logs which tools the model invoked and what they returned, for debugging |
| `ai_memory` | structured assistant memory | category (`preference`/`meal_pattern`/`dislike`/`config`/`goal_context`) + key/value; schema exists, not yet written to by any code path (see `AI.md`) |

## Storage buckets

All three are **private** (`public: false`), 15 MB file-size limit, images
only (plus PDF for `optional-documents`):

- `meal-images` — RLS policy: `(storage.foldername(name))[1] = auth.uid()::text`
- `progress-images` — same pattern
- `optional-documents` — same pattern

Objects are namespaced `<user_id>/<file>`, which is what the RLS policy
checks — there is no separate ACL table.

## Migrations

- `0001_init.sql` — every table, index, RLS policy, and the
  `handle_new_user`/`set_updated_at` triggers.
- `0002_harden_functions_and_extension.sql` — fixes for security-advisor
  findings raised against the objects `0001` created (mutable
  `search_path` on trigger functions, `pg_trgm` moved out of `public`,
  `handle_new_user`'s `EXECUTE` revoked from `anon`/`authenticated` so it
  can only ever run as the `AFTER INSERT ON auth.users` trigger, not be
  called directly over the API).
- `0003_storage_buckets.sql` — the three buckets + their RLS policies.
- `0004_optimize_rls_auth_calls.sql` — performance-advisor fix: every RLS
  policy wraps `auth.uid()` as `(select auth.uid())` so Postgres evaluates
  it once per query instead of once per row (`auth_rls_initplan` lint).
  Pure performance change — no access rule is different after it.

- `0005_training.sql` — el apartado de entreno: `exercises`, `routines`,
  `routine_days`, `routine_exercises`, `workout_sets`, más la ampliación
  de `training_sessions`. RLS en las cinco tablas nuevas con
  `(select auth.uid())`; las hijas se comprueban a través de su padre,
  igual que `meal_items` en `0001`. Índice en cada clave ajena. `anon`
  queda revocado explícitamente (las cinco devuelven `42501`, no una
  lista vacía).
- `0006_seed_exercises.sql` — los 129 ejercicios del catálogo compartido,
  con `on conflict do nothing` para que re-aplicarla no duplique ni pise
  ediciones.
- `0007_training_goals.sql` — `training_goals`: el objetivo de entreno
  del usuario, con historial. `focus` es un `text[]` con CHECK de 1 a 3
  valores del conjunto permitido, y el orden es significativo (el primero
  decide el rango de repeticiones de las sesiones libres). Mismo índice
  parcial único que `nutrition_goals` para que no pueda haber dos
  objetivos abiertos. RLS con `(select auth.uid())`. Aditiva: no toca
  ninguna tabla existente.

### Lo que deliberadamente NO está en el esquema

Los **récords personales** y el **volumen semanal por músculo** no tienen
tabla: se derivan de `workout_sets` en cada lectura
(`src/lib/training/records.ts` y `src/lib/training/volume.ts`). Una tabla
de récords sería un segundo sitio donde vive la misma verdad, y el día que
se corrija una serie mal metida se quedaría mintiendo. El índice
`workout_sets_exercise_history_idx` es lo que hace que derivarlos sea
barato.

Nota sobre `training_sessions` y `anon`: a diferencia de las cinco tablas
nuevas, no lleva un `REVOKE ... FROM anon` porque viene de `0001` y
comparte criterio con el resto de tablas de nutrición. Sin sesión devuelve
una lista vacía en vez de un error de permisos — el resultado es el mismo
(no se ve nada), sólo cambia la forma de decirlo.

Apply new migrations with the Supabase MCP/CLI against project
`pyiukqeuaxonsrrgbfzq`, or `supabase db push` once you have the CLI linked
locally (see `DEPLOYMENT.md`).

## Regenerating types

`src/lib/supabase/types.ts` is hand-written (deliberately — it only
declares the columns the app actually reads/writes, which stays much more
readable than the exhaustive generated version). If the schema drifts,
regenerate the full types with the Supabase CLI and diff:

```bash
supabase gen types typescript --project-id pyiukqeuaxonsrrgbfzq > /tmp/full-types.ts
diff /tmp/full-types.ts src/lib/supabase/types.ts
```
