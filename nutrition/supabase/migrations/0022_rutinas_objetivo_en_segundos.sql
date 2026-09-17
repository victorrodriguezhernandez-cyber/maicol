-- La rutina también puede pautar segundos.
--
-- La 0008 arregló el REGISTRO: cada ejercicio declara si se le miden
-- kilos, repeticiones o segundos, y el paseo del granjero ya puede
-- apuntar peso y tiempo. Pero la RUTINA seguía teniendo un único par de
-- columnas, `target_reps_min/max`, así que una plancha dentro de una
-- rutina quedaba pautada como "3 × 1-1" y el editor pedía "reps mín." y
-- "reps máx." para un ejercicio que no tiene repeticiones. Es el mismo
-- fallo un paso más adelante.
--
-- Ahora `target_duration_min/max` son el objetivo en SEGUNDOS, y son
-- nullable: la gran mayoría de los ejercicios no los usa. Cuál de los dos
-- pares manda no lo decide la rutina, lo decide el ejercicio
-- (`tracks_reps` / `tracks_duration`), que es donde está declarado.
--
-- `target_reps_min/max` se quedan NOT NULL, con 1-1 en los de tiempo: hay
-- rutinas ya guardadas y cambiar esas columnas a nullable obligaría a
-- revisar cada sitio que las lee. El valor 1-1 no se enseña nunca — la
-- pantalla pregunta primero al ejercicio qué mide.

alter table public.routine_exercises
  add column if not exists target_duration_min integer,
  add column if not exists target_duration_max integer;

comment on column public.routine_exercises.target_duration_min is
  'Objetivo en segundos por serie. Sólo se usa si el ejercicio tiene tracks_duration. Nulo si no.';

alter table public.routine_exercises
  drop constraint if exists routine_exercises_rango_de_tiempo;
alter table public.routine_exercises
  add constraint routine_exercises_rango_de_tiempo check (
    (target_duration_min is null and target_duration_max is null)
    or (target_duration_min is not null and target_duration_max is not null
        and target_duration_min > 0 and target_duration_max >= target_duration_min)
  );

-- Las filas que ya existen de ejercicios de tiempo se rellenan con el
-- rango por defecto del propio ejercicio, que es lo que la pantalla
-- enseñaba de todos modos. Así ninguna rutina guardada se queda con un
-- objetivo vacío.
update public.routine_exercises re
set target_duration_min = e.default_duration_min,
    target_duration_max = e.default_duration_max
from public.exercises e
where e.id = re.exercise_id
  and e.tracks_duration
  and re.target_duration_min is null
  and e.default_duration_min is not null;
