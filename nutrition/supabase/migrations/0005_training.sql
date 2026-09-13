-- =========================================================================
-- 0005_training.sql — el apartado de entreno
--
-- Cinco tablas nuevas más una ampliación de `training_sessions`, que
-- existía desde 0001 como un hueco reservado (fecha + tipo + duración, sin
-- UI) para correlacionar entreno y nutrición. En vez de crear una tabla
-- paralela y dejar dos verdades, la ampliamos: sigue siendo LA sesión de
-- entreno, ahora con todo lo que hace falta para registrarla en directo.
--
-- Lo que NO se guarda, a propósito:
--
--   * Los récords personales. Se derivan de `workout_sets` con un índice
--     que hace la consulta trivial. Una tabla de PRs sería un segundo
--     sitio donde vive la misma verdad, y el día que alguien corrija una
--     serie mal metida la tabla se queda mintiendo. Ver
--     `src/lib/training/records.ts`.
--   * El volumen semanal por músculo. Misma razón: es una suma sobre
--     `workout_sets` × `exercises.primary_muscle`. Ver
--     `src/lib/training/volume.ts`, que además documenta por qué una
--     serie de un músculo secundario cuenta 0,5 y por qué el calentamiento
--     no cuenta nada.
-- =========================================================================

-- ---------------------------------------------------------------------
-- Taxonomía de músculos
--
-- Estos 17 valores son el contrato entre la base de datos, el cálculo de
-- volumen y el mapa muscular en SVG: cada uno tiene su trazado en
-- `src/components/training/BodyMap.tsx`. Añadir un músculo aquí sin
-- dibujarlo allí deja un hueco silencioso en el mapa, así que hay un test
-- que compara ambas listas.
--
-- Se modela como un dominio y no como un enum de Postgres porque un enum
-- no admite borrar valores y obliga a un ALTER TYPE fuera de transacción
-- en cada cambio; un CHECK sobre texto se modifica con un ALTER TABLE
-- normal.
-- ---------------------------------------------------------------------
create domain public.muscle_group as text
  check (value in (
    'pecho',
    'dorsal',
    'espalda_alta',
    'deltoide_anterior',
    'deltoide_lateral',
    'deltoide_posterior',
    'biceps',
    'triceps',
    'antebrazo',
    'abdominales',
    'oblicuos',
    'lumbares',
    'gluteo',
    'cuadriceps',
    'isquiotibiales',
    'aductores',
    'gemelos'
  ));

comment on domain public.muscle_group is
  'Grupo muscular. Los 17 valores tienen trazado propio en el mapa SVG; '
  'ver la lista espejo en src/lib/training/muscles.ts.';

-- ---------------------------------------------------------------------
-- exercises — el catálogo de ejercicios
--
-- Mismo patrón que `foods`: `user_id IS NULL` ⇒ ejercicio del catálogo
-- compartido (lo siembra la migración 0006); `user_id` puesto ⇒ ejercicio
-- propio del usuario. Así "mis ejercicios" y "el catálogo" se consultan
-- con la misma query y una rutina puede mezclar ambos sin saber cuál es
-- cuál.
-- ---------------------------------------------------------------------
create table public.exercises (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,

  name text not null check (length(trim(name)) between 1 and 120),
  -- Minúsculas y sin acentos, para buscar sin que "Prensa" y "prensa"
  -- sean cosas distintas. Lo mantiene un trigger, nunca la aplicación.
  name_normalized text not null,

  primary_muscle public.muscle_group not null,
  -- Músculos que trabajan de forma significativa pero no son el objetivo.
  -- Cuentan como media serie en el volumen semanal (ver volume.ts).
  secondary_muscles public.muscle_group[] not null default '{}',

  equipment text not null check (equipment in (
    'barra', 'mancuernas', 'polea', 'maquina', 'peso_corporal',
    'kettlebell', 'banda', 'disco', 'multipower', 'otro'
  )),

  -- Compuesto = cruza más de una articulación. Determina el descanso por
  -- defecto y el orden sugerido dentro de la sesión.
  mechanic text not null check (mechanic in ('compuesto', 'aislamiento')),

  -- Patrón de movimiento. Es lo que permite a la IA montar una rutina
  -- equilibrada (un empuje por cada tirón) en vez de elegir por nombre.
  pattern text not null check (pattern in (
    'empuje_horizontal', 'empuje_vertical',
    'tiron_horizontal', 'tiron_vertical',
    'dominante_rodilla', 'dominante_cadera',
    'aislamiento_brazo', 'aislamiento_hombro',
    'aislamiento_pierna', 'core', 'transporte'
  )),

  -- Un ejercicio unilateral se registra por lado; el volumen de una serie
  -- cuenta igual (una serie de press unilateral estimula el pectoral de
  -- ese lado tanto como una bilateral estimula ambos).
  is_unilateral boolean not null default false,

  -- Rango de repeticiones por defecto al añadirlo a una rutina. No es una
  -- regla: es el punto de partida que el usuario puede cambiar.
  default_reps_min smallint not null default 8 check (default_reps_min between 1 and 100),
  default_reps_max smallint not null default 12 check (default_reps_max between 1 and 100),
  default_rest_seconds smallint not null default 90 check (default_rest_seconds between 0 and 900),

  -- Cómo se ejecuta. Texto real, no un hueco: si un ejercicio del catálogo
  -- no tiene instrucciones, no entra en el catálogo.
  cues text,

  is_active boolean not null default true,
  created_at timestamptz not null default now(),

  constraint exercises_rep_range_ordered check (default_reps_max >= default_reps_min)
);

-- Búsqueda por nombre dentro de lo que el usuario puede ver (su catálogo
-- privado + el compartido). `text_pattern_ops` sirve el `LIKE 'algo%'` que
-- usa el buscador; sin él, cada tecleo es un seq scan.
create index exercises_name_search_idx
  on public.exercises (name_normalized text_pattern_ops);
-- Trigramas, igual que `foods`: es lo que permite emparejar por parecido.
-- Lo necesita el importador — cuando la IA lee "press inclinado con
-- mancuernas" de una foto, tiene que encontrar "Press inclinado con
-- mancuernas" del catálogo sin que coincida letra por letra.
create index exercises_name_trgm_idx
  on public.exercises using gin (name_normalized extensions.gin_trgm_ops);
create index exercises_user_idx on public.exercises (user_id) where user_id is not null;
create index exercises_primary_muscle_idx on public.exercises (primary_muscle) where is_active;
-- El filtro "qué ejercicios tocan este músculo" incluye los secundarios,
-- y un array sólo se busca rápido con GIN.
create index exercises_secondary_muscles_idx
  on public.exercises using gin (secondary_muscles);

-- Un usuario no puede tener dos ejercicios propios con el mismo nombre;
-- el catálogo compartido tampoco puede duplicar. Índices parciales
-- separados porque `unique (user_id, name_normalized)` trataría cada NULL
-- como distinto y dejaría duplicar el catálogo.
create unique index exercises_unique_per_user_idx
  on public.exercises (user_id, name_normalized) where user_id is not null;
create unique index exercises_unique_shared_idx
  on public.exercises (name_normalized) where user_id is null;

-- ---------------------------------------------------------------------
-- routines — un plan de entrenamiento
-- ---------------------------------------------------------------------
create table public.routines (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  name text not null check (length(trim(name)) between 1 and 120),
  -- El objetivo cambia los rangos de repeticiones y descansos que se
  -- proponen, y es lo que la IA usa para decidir la estructura.
  goal text not null default 'hipertrofia' check (goal in (
    'fuerza', 'hipertrofia', 'resistencia', 'mantenimiento'
  )),
  notes text,

  -- De dónde salió. Se muestra en la rutina para que dentro de seis meses
  -- se sepa si la escribió él o se la propuso la IA a partir de una foto.
  source text not null default 'manual' check (source in (
    'manual', 'ia_chat', 'ia_foto', 'plantilla'
  )),

  -- Una sola rutina activa a la vez: es la que se ofrece al abrir Entreno.
  is_active boolean not null default false,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index routines_user_idx on public.routines (user_id, created_at desc);
-- Garantiza "como mucho una rutina activa", sin depender de que la
-- aplicación se acuerde de desactivar la anterior.
create unique index routines_one_active_idx
  on public.routines (user_id) where is_active and archived_at is null;

-- ---------------------------------------------------------------------
-- routine_days — un día dentro de la rutina ("Empuje A", "Pierna")
-- ---------------------------------------------------------------------
create table public.routine_days (
  id uuid primary key default gen_random_uuid(),
  routine_id uuid not null references public.routines(id) on delete cascade,
  position smallint not null check (position between 1 and 14),
  name text not null check (length(trim(name)) between 1 and 60),
  notes text,
  created_at timestamptz not null default now(),

  unique (routine_id, position)
);

create index routine_days_routine_idx on public.routine_days (routine_id, position);

-- ---------------------------------------------------------------------
-- routine_exercises — un ejercicio programado dentro de un día
--
-- Guarda el objetivo (series, rango de reps, RIR, descanso), no el
-- resultado. Lo que se hizo de verdad vive en `workout_sets`.
-- ---------------------------------------------------------------------
create table public.routine_exercises (
  id uuid primary key default gen_random_uuid(),
  routine_day_id uuid not null references public.routine_days(id) on delete cascade,
  -- restrict, no cascade: borrar un ejercicio del catálogo no puede
  -- vaciar en silencio una rutina que lo usa. La aplicación desactiva
  -- (`is_active = false`) en vez de borrar.
  exercise_id uuid not null references public.exercises(id) on delete restrict,

  position smallint not null check (position between 1 and 30),
  target_sets smallint not null default 3 check (target_sets between 1 and 20),
  target_reps_min smallint not null check (target_reps_min between 1 and 100),
  target_reps_max smallint not null check (target_reps_max between 1 and 100),

  -- Repeticiones en recámara: cuántas te quedarían al acabar la serie.
  -- Es la forma de pautar intensidad sin conocer el 1RM. NULL = sin pautar.
  target_rir numeric(2,1) check (target_rir between 0 and 10),
  rest_seconds smallint not null default 90 check (rest_seconds between 0 and 900),
  notes text,

  -- Superserie: dos ejercicios con la misma letra se hacen encadenados.
  superset_group text check (superset_group ~ '^[A-Z]$'),

  created_at timestamptz not null default now(),

  unique (routine_day_id, position),
  constraint routine_exercises_rep_range_ordered check (target_reps_max >= target_reps_min)
);

create index routine_exercises_day_idx on public.routine_exercises (routine_day_id, position);
create index routine_exercises_exercise_idx on public.routine_exercises (exercise_id);

-- ---------------------------------------------------------------------
-- training_sessions — ampliación
--
-- Ya existía (0001) con session_date / session_type / duration_min /
-- notes. Se le añade el estado de una sesión que se registra en directo.
-- ---------------------------------------------------------------------
alter table public.training_sessions
  add column routine_id uuid references public.routines(id) on delete set null,
  add column routine_day_id uuid references public.routine_days(id) on delete set null,
  add column title text,
  add column started_at timestamptz,
  add column finished_at timestamptz,
  -- 'en_curso' es la sesión abierta ahora mismo en el móvil; sólo puede
  -- haber una (índice parcial más abajo).
  add column status text not null default 'completada' check (status in (
    'en_curso', 'completada', 'abandonada'
  )),
  -- Esfuerzo percibido de la sesión entera (RPE 1-10). Opcional: si no lo
  -- rellena, no se inventa.
  add column perceived_effort smallint check (perceived_effort between 1 and 10),
  add column bodyweight_kg numeric(5,2) check (bodyweight_kg > 0 and bodyweight_kg < 500);

comment on column public.training_sessions.bodyweight_kg is
  'Peso corporal en el momento de la sesión, copiado del último weigh-in. '
  'Se guarda aquí y no se lee de weight_entries al mostrar, porque los '
  'ejercicios de peso corporal necesitan el peso de ESE día para calcular '
  'la carga (mismo criterio de snapshot que meal_items).';

create index training_sessions_routine_idx on public.training_sessions (routine_id);
create index training_sessions_routine_day_idx on public.training_sessions (routine_day_id);
create unique index training_sessions_one_open_idx
  on public.training_sessions (user_id) where status = 'en_curso';

-- ---------------------------------------------------------------------
-- workout_sets — la serie. Es el dato real de todo el apartado.
-- ---------------------------------------------------------------------
create table public.workout_sets (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.training_sessions(id) on delete cascade,
  exercise_id uuid not null references public.exercises(id) on delete restrict,

  -- Orden del ejercicio dentro de la sesión, y de la serie dentro del
  -- ejercicio. Los dos hacen falta: el mismo ejercicio puede repetirse.
  exercise_position smallint not null check (exercise_position between 1 and 30),
  set_number smallint not null check (set_number between 1 and 30),

  -- El tipo cambia cómo cuenta para el volumen y para los récords:
  --   calentamiento → no cuenta ni para volumen ni para PR
  --   normal        → cuenta entero
  --   dropset       → cuenta como serie, pero no opta a PR de peso
  --   backoff       → serie de bajada tras la pesada; cuenta entero
  --   fallo         → llevada al fallo muscular; cuenta entero
  set_type text not null default 'normal' check (set_type in (
    'calentamiento', 'normal', 'dropset', 'backoff', 'fallo'
  )),

  -- numeric, no float: 62.5 kg tiene que ser 62,5 exactos.
  weight_kg numeric(6,2) check (weight_kg >= 0 and weight_kg < 1000),
  reps smallint check (reps between 0 and 1000),
  -- Duración, para planchas y similares (el ejercicio dice cuál aplica).
  duration_seconds integer check (duration_seconds between 0 and 86400),

  rir numeric(2,1) check (rir between 0 and 10),
  rest_taken_seconds integer check (rest_taken_seconds between 0 and 3600),
  notes text check (notes is null or length(notes) <= 500),

  -- Una serie existe en cuanto se planifica; `completed_at` es lo que la
  -- convierte en un hecho. Sin completar no cuenta para nada.
  completed_at timestamptz,
  created_at timestamptz not null default now(),

  unique (session_id, exercise_position, set_number),

  -- Una serie completada tiene que decir qué se hizo: o repeticiones, o
  -- tiempo. Sin esto se podrían guardar series vacías que luego cuentan
  -- como volumen.
  constraint workout_sets_completed_has_work check (
    completed_at is null or reps is not null or duration_seconds is not null
  )
);

create index workout_sets_session_idx
  on public.workout_sets (session_id, exercise_position, set_number);
-- El índice que sostiene el historial por ejercicio y la detección de
-- récords: "las series completadas de este ejercicio, de la más reciente
-- a la más antigua".
create index workout_sets_exercise_history_idx
  on public.workout_sets (exercise_id, completed_at desc)
  where completed_at is not null;

-- =========================================================================
-- Normalización del nombre de ejercicio
--
-- En un trigger y no en la aplicación: así vale igual si la fila la crea
-- la app, una migración de siembra o una consulta a mano.
--
-- Los acentos se quitan con `translate` y no con la extensión `unaccent`
-- para no añadir una dependencia por algo que en castellano son seis
-- vocales y una eñe. Determinista y sin extensión que instalar.
-- =========================================================================
create or replace function public.set_exercise_name_normalized()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.name_normalized := translate(
    lower(trim(new.name)),
    'áàäâãéèëêíìïîóòöôõúùüûñç',
    'aaaaaeeeeiiiiooooouuuunc'
  );
  return new;
end;
$$;

create trigger exercises_normalize_name
  before insert or update of name on public.exercises
  for each row execute function public.set_exercise_name_normalized();

-- =========================================================================
-- updated_at de routines
-- =========================================================================
create or replace function public.touch_routine_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger routines_touch_updated_at
  before update on public.routines
  for each row execute function public.touch_routine_updated_at();

-- =========================================================================
-- Row Level Security
--
-- `(select auth.uid())` y no `auth.uid()`: envuelto en un SELECT el
-- planificador lo evalúa una vez por consulta en vez de una vez por fila.
-- Las tablas hijas (routine_days, routine_exercises, workout_sets) no
-- tienen user_id propio y se comprueban a través de su padre, igual que
-- meal_items/recipe_items en 0001.
-- =========================================================================
alter table public.exercises enable row level security;
alter table public.routines enable row level security;
alter table public.routine_days enable row level security;
alter table public.routine_exercises enable row level security;
alter table public.workout_sets enable row level security;

-- El catálogo compartido (user_id IS NULL) lo lee cualquiera autenticado,
-- pero sólo lo escribe el service_role desde código de servidor: por eso
-- el WITH CHECK exige user_id = uid(), que nunca se cumple para NULL.
create policy "exercises_read" on public.exercises
  for select to authenticated
  using (user_id is null or user_id = (select auth.uid()));

create policy "exercises_insert_own" on public.exercises
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "exercises_update_own" on public.exercises
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "exercises_delete_own" on public.exercises
  for delete to authenticated
  using (user_id = (select auth.uid()));

create policy "routines_self" on public.routines
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

create policy "routine_days_via_routine" on public.routine_days
  for all to authenticated
  using (exists (
    select 1 from public.routines r
    where r.id = routine_days.routine_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.routines r
    where r.id = routine_days.routine_id and r.user_id = (select auth.uid())
  ));

create policy "routine_exercises_via_day" on public.routine_exercises
  for all to authenticated
  using (exists (
    select 1 from public.routine_days d
    join public.routines r on r.id = d.routine_id
    where d.id = routine_exercises.routine_day_id and r.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.routine_days d
    join public.routines r on r.id = d.routine_id
    where d.id = routine_exercises.routine_day_id and r.user_id = (select auth.uid())
  ));

create policy "workout_sets_via_session" on public.workout_sets
  for all to authenticated
  using (exists (
    select 1 from public.training_sessions s
    where s.id = workout_sets.session_id and s.user_id = (select auth.uid())
  ))
  with check (exists (
    select 1 from public.training_sessions s
    where s.id = workout_sets.session_id and s.user_id = (select auth.uid())
  ));

-- `anon` no pinta nada aquí: sin sesión no hay nada que leer.
revoke all on public.exercises from anon;
revoke all on public.routines from anon;
revoke all on public.routine_days from anon;
revoke all on public.routine_exercises from anon;
revoke all on public.workout_sets from anon;
