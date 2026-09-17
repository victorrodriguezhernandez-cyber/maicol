-- Ejercicios que se explican de verdad, y un apartado de "más comunes".
--
-- ── Por qué `cues` no era suficiente ────────────────────────────────────
--
-- `cues` es una frase de consejo: "tumbado a lo ancho del banco", "no
-- ruedes los hombros". Eso vale para quien YA sabe hacer el ejercicio.
-- A quien no lo ha hecho nunca no le dice ni cómo colocarse ni qué se
-- mueve, así que la app le está pidiendo que haga algo que no le ha
-- enseñado. Un consejo no es una instrucción.
--
-- Por eso se separan tres cosas, en vez de meterlas en un campo:
--
--   how_to    Los pasos, en orden, desde no saber nada: dónde te pones,
--             qué agarras, qué se mueve, hasta dónde y cuándo respiras.
--             Una línea por paso; la pantalla los numera.
--   mistakes  Los fallos concretos que se cometen en ESTE ejercicio y
--             qué pasa si los cometes. Una línea por fallo.
--   cues      Se queda como está: el recordatorio corto de la serie.
--
-- Se separan porque se leen en momentos distintos — `how_to` la primera
-- vez, `cues` entre series con el móvil en la mano — y porque un campo
-- único obligaría a enseñar las dos cosas siempre o ninguna.
--
-- Quedan nullable: un ejercicio que se crea el usuario no puede exigir
-- que escriba un manual. La pantalla enseña lo que haya.

alter table public.exercises
  add column if not exists how_to text,
  add column if not exists mistakes text,
  add column if not exists is_common boolean not null default false;

comment on column public.exercises.how_to is
  'Pasos en orden para alguien que no ha hecho nunca el ejercicio. Una línea por paso.';
comment on column public.exercises.mistakes is
  'Fallos concretos de este ejercicio y su consecuencia. Una línea por fallo.';
comment on column public.exercises.is_common is
  'Va en el apartado "Más comunes" del selector. Es una lista curada del catálogo compartido, no una medida de uso: no hay datos de uso de otros usuarios y no se van a inventar.';

-- El selector filtra por aquí en cuanto se abre, así que merece índice.
-- Parcial: sólo hay filas `true` en el catálogo compartido y son pocas.
create index if not exists exercises_is_common_idx
  on public.exercises (is_common)
  where is_common and is_active;

-- ── Qué entra en "Más comunes" ──────────────────────────────────────────
--
-- Los ejercicios que cualquiera que haya pisado un gimnasio reconoce, más
-- los básicos de casa sin material. El criterio es "lo encuentras en casi
-- cualquier rutina y en casi cualquier gimnasio", no "es el mejor": un
-- ejercicio mejor pero raro no ayuda a quien está montando su primera
-- rutina y no sabe por dónde empezar.
--
-- Es una lista curada y la app lo dice en pantalla. Ordenarla por "lo que
-- más usa la gente" sería mentir: no hay datos de uso de otros usuarios
-- (cada uno sólo ve los suyos por RLS) y fabricar un ranking a partir de
-- nada es exactamente lo que la regla 11 prohíbe.

update public.exercises set is_common = true
where user_id is null and name in (
  -- Pecho
  'Press de banca con barra',
  'Press de banca inclinado con barra',
  'Press de banca con mancuernas',
  'Press inclinado con mancuernas',
  'Press de pecho en máquina',
  'Aperturas con mancuernas',
  'Contractor de pecho en máquina',
  'Cruce de poleas desde arriba',
  'Flexiones',
  'Fondos en paralelas para pecho',
  -- Espalda
  'Dominadas pronas',
  'Jalón al pecho en polea',
  'Remo con barra',
  'Remo con mancuerna a una mano',
  'Remo sentado en polea',
  'Remo en máquina',
  'Encogimientos con mancuernas',
  -- Hombro
  'Press militar con barra de pie',
  'Press de hombro con mancuernas',
  'Press de hombro en máquina',
  'Elevaciones laterales con mancuernas',
  'Elevaciones frontales con mancuernas',
  'Pájaros con mancuernas',
  'Face pull en polea',
  -- Brazo
  'Curl con barra',
  'Curl alterno con mancuernas',
  'Curl martillo',
  'Curl en polea baja',
  'Extensión de tríceps en polea alta',
  'Extensión con cuerda en polea',
  'Press francés con barra Z',
  'Fondos entre bancos',
  -- Pierna
  'Sentadilla trasera con barra',
  'Prensa de piernas',
  'Extensión de cuádriceps en máquina',
  'Sentadilla búlgara',
  'Zancadas caminando',
  'Peso muerto convencional',
  'Peso muerto rumano con barra',
  'Curl femoral tumbado',
  'Curl femoral sentado',
  'Hip thrust con barra',
  'Elevación de talones de pie',
  'Elevación de talones sentado',
  -- Core
  'Plancha frontal',
  'Crunch en suelo',
  'Elevación de piernas colgado',
  'Crunch en polea arrodillado',
  'Rueda abdominal',
  'Plancha lateral',
  'Giro ruso',
  'Hiperextensiones en banco romano'
);
