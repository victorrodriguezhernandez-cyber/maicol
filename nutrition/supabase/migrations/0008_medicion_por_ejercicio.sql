-- ---------------------------------------------------------------------
-- Qué mide cada ejercicio, declarado en lugar de deducido
-- ---------------------------------------------------------------------
--
-- Hasta ahora la app DEDUCÍA la medición del patrón de movimiento:
-- `pattern = 'transporte'` significaba "esto va por tiempo", y el
-- registro escondía la columna de peso. El resultado es que un paseo del
-- granjero — que es peso Y tiempo — no tenía dónde apuntar los kilos.
-- No era un detalle estético: el dato se perdía.
--
-- Deducir la medición del patrón nunca podía funcionar, porque son dos
-- cosas distintas. Un mismo patrón admite ejercicios que se miden de
-- formas diferentes (un transporte por tiempo o por distancia; un core
-- por repeticiones o isométrico), y un mismo tipo de medición aparece en
-- patrones que no tienen nada que ver.
--
-- Así que ahora cada ejercicio lo dice. Son tres interruptores
-- independientes porque se combinan: hay ejercicios de sólo
-- repeticiones, de sólo tiempo, y de peso + tiempo.

alter table public.exercises
  -- ¿Tiene sentido apuntar kilos? En peso corporal suele seguir
  -- teniéndolo (dominadas con lastre, plancha con disco), así que esto
  -- es true casi siempre; se pone false sólo cuando cargar peso no
  -- significa nada.
  add column tracks_weight boolean not null default true,
  add column tracks_reps boolean not null default true,
  add column tracks_duration boolean not null default false,

  -- Rango por defecto en SEGUNDOS, el equivalente de
  -- default_reps_min/max para los ejercicios que van por tiempo. Nulo en
  -- los que no se miden así.
  add column default_duration_min integer
    check (default_duration_min is null or default_duration_min between 1 and 3600),
  add column default_duration_max integer
    check (default_duration_max is null or default_duration_max between 1 and 3600);

-- Un ejercicio que no mide ni repeticiones ni tiempo no se puede
-- registrar: no habría nada que apuntar. El peso solo no basta.
alter table public.exercises
  add constraint exercises_algo_que_medir
  check (tracks_reps or tracks_duration);

-- Y si mide tiempo, tiene que traer su rango, igual que los de
-- repeticiones traen el suyo. Si no, la pantalla no tiene nada que
-- pautar y acabaría inventándose un número.
alter table public.exercises
  add constraint exercises_rango_de_tiempo
  check (
    not tracks_duration
    or (default_duration_min is not null
        and default_duration_max is not null
        and default_duration_max >= default_duration_min)
  );

-- ---------------------------------------------------------------------
-- Migrar los 129 ejercicios que ya existen
-- ---------------------------------------------------------------------
-- Se reproduce exactamente lo que hacía la función deducida, para que
-- ningún ejercicio cambie de comportamiento por esta migración, y luego
-- se corrige lo que estaba mal.

-- Transportes (paseo del granjero, transporte en rack...): peso Y tiempo.
-- Antes eran "sólo tiempo" y ahí se perdía la carga, que es justamente lo
-- que define el ejercicio.
update public.exercises
   set tracks_reps = false,
       tracks_duration = true,
       tracks_weight = true,
       default_duration_min = 20,
       default_duration_max = 45
 where pattern = 'transporte';

-- Isométricos de core (plancha y variantes): la app los reconocía por el
-- truco de dejar el rango de repeticiones en 1-1, que es lo que hacía que
-- la pantalla dijera "1-1 reps" y "que puedas mover 1 veces".
update public.exercises
   set tracks_reps = false,
       tracks_duration = true,
       tracks_weight = true,
       default_duration_min = 30,
       default_duration_max = 60
 where pattern = 'core'
   and default_reps_max = 1;

-- Los rangos de repeticiones de esos ejercicios eran un apaño para
-- marcarlos como isométricos. Ya no significan nada, así que se dejan en
-- un valor neutro para que nadie los lea como una pauta real.
update public.exercises
   set default_reps_min = 1,
       default_reps_max = 1
 where not tracks_reps;
