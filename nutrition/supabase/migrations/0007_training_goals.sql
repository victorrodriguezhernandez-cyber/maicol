-- ---------------------------------------------------------------------
-- training_goals — qué persigues entrenando, y desde cuándo
-- ---------------------------------------------------------------------
--
-- `routines.goal` ya dice a qué va UNA rutina, pero eso es el plan, no la
-- persona: si cambias de rutina el objetivo se pierde, y no hay dónde
-- decir "quiero fuerza y volumen a la vez" ni explicarlo con tus
-- palabras. Esta tabla guarda eso, y es su propio historial igual que
-- `nutrition_goals` (sección 51 de la especificación): un objetivo nuevo
-- cierra el anterior poniéndole `effective_to`, nunca lo sobrescribe.
-- Así se puede mirar atrás y ver con qué objetivo entrenabas en marzo.
--
-- La dirección del peso corporal (subir / bajar / mantener) NO se duplica
-- aquí: vive en `nutrition_goals.mode`, que es quien de verdad la usa
-- para calcular las calorías. La pantalla de objetivos enseña las dos
-- juntas para que se lean como una sola cosa.

create table public.training_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,

  -- Varios focos a la vez, porque "fuerza y volumen" es una respuesta
  -- legítima y obligar a elegir uno falsearía el objetivo. EL ORDEN
  -- IMPORTA: el primero es el principal y es el que manda cuando dos
  -- focos piden rangos de repeticiones distintos.
  focus text[] not null
    check (
      array_length(focus, 1) between 1 and 3
      and focus <@ array[
        'fuerza',        -- mover más peso
        'hipertrofia',   -- volumen muscular
        'resistencia',   -- aguantar más series/repeticiones
        'mantenimiento', -- conservar lo que hay
        'salud'          -- moverse, sin una cifra que perseguir
      ]::text[]
    ),

  -- Con tus palabras. Existe porque ninguna lista de cinco opciones
  -- cubre "quiero que no me duela el hombro y seguir subiendo en press".
  -- Se le pasa al coach como contexto; no lo lee ningún algoritmo, y por
  -- eso no promete nada que no pueda cumplir.
  notes text check (notes is null or char_length(notes) <= 1000),

  effective_from date not null default current_date,
  effective_to date,
  created_at timestamptz not null default now(),

  constraint training_goals_period check (effective_to is null or effective_to >= effective_from)
);

create index training_goals_user_effective_idx
  on public.training_goals (user_id, effective_from desc);

-- Un único objetivo abierto por usuario, igual que en nutrition_goals:
-- es lo que hace imposible tener dos "objetivos actuales" a la vez.
create unique index training_goals_one_open_per_user
  on public.training_goals (user_id)
  where effective_to is null;

alter table public.training_goals enable row level security;

create policy "training_goals_self" on public.training_goals
  for all using ((select auth.uid()) = user_id) with check ((select auth.uid()) = user_id);
