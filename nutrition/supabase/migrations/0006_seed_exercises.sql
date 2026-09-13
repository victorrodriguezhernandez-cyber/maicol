-- =========================================================================
-- 0006_seed_exercises.sql — el catálogo compartido de ejercicios
--
-- 129 ejercicios con `user_id IS NULL`, es decir, visibles para cualquier
-- usuario y editables por ninguno (ver las políticas RLS de 0005). El
-- usuario añade los suyos encima; estos son el suelo.
--
-- Criterios para que un ejercicio entre aquí:
--
--   1. Se hace en un gimnasio normal o en casa con material corriente.
--      Nada que requiera una máquina de una sola marca.
--   2. Tiene `cues` de verdad — una o dos frases con el error que más se
--      comete. Un ejercicio sin instrucciones no entra: la regla 9 del
--      proyecto (nada simulado) vale también para el contenido.
--   3. Su `pattern` está bien puesto. Es lo que usa el generador de
--      rutinas para equilibrar empujes y tirones; si el patrón miente, la
--      rutina que salga estará desequilibrada sin que se note.
--
-- Sobre `secondary_muscles`: sólo músculos que trabajan de forma
-- significativa, no todos los que se activan. Cada secundario cuenta como
-- media serie en el volumen semanal (src/lib/training/volume.ts), así que
-- inflar esta lista infla el volumen y hace que la app diga "te estás
-- pasando" cuando no es verdad.
--
-- `on conflict do nothing` sobre el índice único del catálogo: re-aplicar
-- esta migración no duplica ni pisa ediciones.
-- =========================================================================

insert into public.exercises (
  user_id, name, name_normalized, primary_muscle, secondary_muscles,
  equipment, mechanic, pattern, is_unilateral,
  default_reps_min, default_reps_max, default_rest_seconds, cues
) values
-- ---------------------------------------------------------------- PECHO
(null, 'Press de banca con barra', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'barra', 'compuesto', 'empuje_horizontal', false, 5, 8, 180, 'Omóplatos juntos y hundidos contra el banco durante toda la serie. La barra baja a la línea del pezón, no al cuello, y los codos van a unos 45° del torso.'),
(null, 'Press de banca inclinado con barra', '', 'pecho', array['deltoide_anterior','triceps']::public.muscle_group[], 'barra', 'compuesto', 'empuje_horizontal', false, 6, 10, 150, 'Banco entre 30° y 45°: por encima de 45° el trabajo se va al hombro. La barra baja a la clavícula.'),
(null, 'Press de banca declinado con barra', '', 'pecho', array['triceps']::public.muscle_group[], 'barra', 'compuesto', 'empuje_horizontal', false, 6, 10, 150, 'Asegura los pies antes de descargar la barra. Recorrido algo más corto que en banca plana; no rebotes en el pecho.'),
(null, 'Press de banca con mancuernas', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'mancuernas', 'compuesto', 'empuje_horizontal', false, 8, 12, 120, 'Permite bajar más que con barra. Baja hasta notar estiramiento en el pecho, sin que los codos caigan por detrás de la línea del hombro.'),
(null, 'Press inclinado con mancuernas', '', 'pecho', array['deltoide_anterior','triceps']::public.muscle_group[], 'mancuernas', 'compuesto', 'empuje_horizontal', false, 8, 12, 120, 'Sube las mancuernas con el impulso de las rodillas para colocarte. Arriba no las choques: perder tensión ahí es perder media repetición.'),
(null, 'Aperturas con mancuernas', '', 'pecho', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'empuje_horizontal', false, 10, 15, 90, 'Codos ligeramente flexionados y fijos: si se abren y cierran, es un press. Baja hasta sentir estiramiento, nunca más allá.'),
(null, 'Aperturas inclinadas con mancuernas', '', 'pecho', array['deltoide_anterior']::public.muscle_group[], 'mancuernas', 'aislamiento', 'empuje_horizontal', false, 10, 15, 90, 'Mismo gesto que la apertura plana pero con el banco a 30°. Carga menos peso del que crees: el brazo de palanca es largo.'),
(null, 'Cruce de poleas desde arriba', '', 'pecho', array[]::public.muscle_group[], 'polea', 'aislamiento', 'empuje_horizontal', false, 12, 15, 75, 'Da un paso adelante para que haya tensión desde el principio. Las manos se cruzan por delante del ombligo, no se quedan a la altura del pecho.'),
(null, 'Cruce de poleas desde abajo', '', 'pecho', array['deltoide_anterior']::public.muscle_group[], 'polea', 'aislamiento', 'empuje_horizontal', false, 12, 15, 75, 'Trayectoria de abajo hacia arriba y adentro, terminando a la altura de la barbilla. Trabaja la porción clavicular.'),
(null, 'Contractor de pecho en máquina', '', 'pecho', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'empuje_horizontal', false, 10, 15, 75, 'Ajusta el asiento para que las manos queden a la altura del pecho. Aprieta un segundo al juntar antes de volver.'),
(null, 'Press de pecho en máquina', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'maquina', 'compuesto', 'empuje_horizontal', false, 8, 12, 105, 'La máquina fija la trayectoria, así que puedes llegar cerca del fallo con seguridad. Espalda pegada al respaldo.'),
(null, 'Fondos en paralelas para pecho', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false, 6, 12, 120, 'Inclina el torso hacia delante y deja que los codos se abran un poco: eso es lo que lo convierte en pecho y no en tríceps.'),
(null, 'Flexiones', '', 'pecho', array['triceps','abdominales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false, 10, 20, 90, 'El cuerpo es una tabla desde la cabeza a los talones. Si la cadera cae, el abdomen no está haciendo su parte.'),
(null, 'Flexiones declinadas', '', 'pecho', array['deltoide_anterior','triceps']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false, 8, 15, 90, 'Pies elevados en un banco. Cuanto más alto el apoyo, más carga en la porción clavicular y en el hombro.'),
(null, 'Press de pecho en multipower', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'multipower', 'compuesto', 'empuje_horizontal', false, 6, 10, 150, 'La guía elimina el equilibrio, así que coloca bien el banco: si la barra no cae sobre el pecho, el hombro paga la diferencia.'),

-- --------------------------------------------------------------- DORSAL
(null, 'Dominadas pronas', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false, 5, 10, 150, 'Empieza colgado del todo y con los omóplatos deprimidos. Lleva el pecho a la barra, no la barbilla por encima como sea.'),
(null, 'Dominadas supinas', '', 'dorsal', array['biceps']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false, 5, 10, 150, 'Agarre supino a la anchura de los hombros. Participa mucho más el bíceps, así que suelen salir más repeticiones que en pronas.'),
(null, 'Dominadas con agarre neutro', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false, 6, 10, 150, 'Palmas enfrentadas. Es la variante más amable con el hombro y el codo si las pronas te molestan.'),
(null, 'Jalón al pecho en polea', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'polea', 'compuesto', 'tiron_vertical', false, 8, 12, 105, 'Tira con los codos hacia las costillas, no con las manos. Inclínate hacia atrás como mucho 15°: más que eso ya es un remo.'),
(null, 'Jalón con agarre estrecho', '', 'dorsal', array['biceps']::public.muscle_group[], 'polea', 'compuesto', 'tiron_vertical', false, 8, 12, 105, 'Agarre en V o supino estrecho. Recorrido más largo y más participación del bíceps que en el jalón abierto.'),
(null, 'Jalón a una mano en polea', '', 'dorsal', array['biceps']::public.muscle_group[], 'polea', 'compuesto', 'tiron_vertical', true, 10, 14, 90, 'Al ir a una mano puedes dejar que el omóplato suba arriba del todo y luego deprimirlo. Más rango que con barra.'),
(null, 'Remo con barra', '', 'dorsal', array['espalda_alta','biceps','lumbares']::public.muscle_group[], 'barra', 'compuesto', 'tiron_horizontal', false, 6, 10, 150, 'Torso entre 30° y 45°, espalda neutra, y esa posición no cambia durante la serie. La barra va al ombligo.'),
(null, 'Remo Pendlay', '', 'dorsal', array['espalda_alta','lumbares']::public.muscle_group[], 'barra', 'compuesto', 'tiron_horizontal', false, 5, 8, 150, 'Torso paralelo al suelo y la barra vuelve al suelo en cada repetición. Cada tirón arranca parado, sin rebote.'),
(null, 'Remo con mancuerna a una mano', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'mancuernas', 'compuesto', 'tiron_horizontal', true, 8, 12, 90, 'Apoya rodilla y mano en el banco. Tira hacia la cadera, no hacia el hombro, y no gires el torso para subir más peso.'),
(null, 'Remo sentado en polea', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'polea', 'compuesto', 'tiron_horizontal', false, 10, 14, 90, 'Pecho alto y torso quieto. Deja que los omóplatos se separen al estirar; ahí está medio ejercicio.'),
(null, 'Remo en máquina', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'maquina', 'compuesto', 'tiron_horizontal', false, 8, 12, 105, 'Pecho apoyado en el soporte, lo que quita la lumbar de la ecuación. Útil los días que ya has hecho peso muerto.'),
(null, 'Remo en barra T', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'barra', 'compuesto', 'tiron_horizontal', false, 8, 12, 120, 'Agarre neutro y codos cerca del cuerpo. Permite bastante carga sin exigir tanto a la lumbar como el remo con barra libre.'),
(null, 'Remo invertido', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_horizontal', false, 8, 15, 90, 'Cuerpo rígido bajo una barra a la altura de la cadera. Cuanto más horizontal te pongas, más pesa.'),
(null, 'Pullover en polea alta', '', 'dorsal', array[]::public.muscle_group[], 'polea', 'aislamiento', 'tiron_vertical', false, 12, 15, 75, 'Brazos casi rectos y codos fijos. Es el único aislamiento decente de dorsal: lleva la barra a los muslos en arco.'),
(null, 'Pullover con mancuerna', '', 'dorsal', array['pecho','triceps']::public.muscle_group[], 'mancuernas', 'aislamiento', 'tiron_vertical', false, 10, 15, 90, 'Tumbado a lo ancho del banco. Baja controlando el estiramiento de la caja torácica; no busques recorrido a costa de arquear la lumbar.'),

-- --------------------------------------------------------- ESPALDA ALTA
(null, 'Encogimientos con barra', '', 'espalda_alta', array[]::public.muscle_group[], 'barra', 'aislamiento', 'tiron_vertical', false, 10, 15, 90, 'Sube los hombros recto hacia las orejas y aguanta arriba. Rodar los hombros no añade nada y carga el manguito.'),
(null, 'Encogimientos con mancuernas', '', 'espalda_alta', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'tiron_vertical', false, 10, 15, 90, 'Con mancuernas a los lados el recorrido es más limpio que con barra. Pausa de un segundo arriba en cada repetición.'),
(null, 'Encogimientos en polea', '', 'espalda_alta', array[]::public.muscle_group[], 'polea', 'aislamiento', 'tiron_vertical', false, 12, 20, 75, 'La polea mantiene tensión también abajo, donde con peso libre se pierde.'),
(null, 'Remo alto con cuerda a la cara', '', 'espalda_alta', array['deltoide_posterior']::public.muscle_group[], 'polea', 'compuesto', 'tiron_horizontal', false, 12, 20, 75, 'Polea a la altura de la cara, codos por encima de las muñecas. Junta los omóplatos al final.'),
(null, 'Elevaciones en Y en banco inclinado', '', 'espalda_alta', array['deltoide_posterior']::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_hombro', false, 12, 20, 60, 'Boca abajo en banco a 30°. Sube los brazos en forma de Y con pulgares arriba. Pesos muy ligeros: esto es trabajo de trapecio inferior.'),

-- --------------------------------------------------- DELTOIDE ANTERIOR
(null, 'Press militar con barra de pie', '', 'deltoide_anterior', array['triceps','deltoide_lateral','abdominales']::public.muscle_group[], 'barra', 'compuesto', 'empuje_vertical', false, 5, 8, 180, 'Aprieta glúteo y abdomen para no arquear la lumbar. Mete la cabeza hacia delante en cuanto la barra pasa la frente.'),
(null, 'Press militar sentado con barra', '', 'deltoide_anterior', array['triceps','deltoide_lateral']::public.muscle_group[], 'barra', 'compuesto', 'empuje_vertical', false, 6, 10, 150, 'Con respaldo puedes centrarte en el hombro sin estabilizar el tronco. Respaldo lo más vertical posible.'),
(null, 'Press de hombro con mancuernas', '', 'deltoide_anterior', array['triceps','deltoide_lateral']::public.muscle_group[], 'mancuernas', 'compuesto', 'empuje_vertical', false, 8, 12, 120, 'Codos ligeramente por delante del plano del cuerpo, no abiertos del todo. Baja hasta que la mancuerna quede a la altura de la oreja.'),
(null, 'Press Arnold', '', 'deltoide_anterior', array['deltoide_lateral','triceps']::public.muscle_group[], 'mancuernas', 'compuesto', 'empuje_vertical', false, 8, 12, 120, 'Empiezas con las palmas hacia ti y giras mientras subes. El giro es el ejercicio; hazlo despacio.'),
(null, 'Press de hombro en máquina', '', 'deltoide_anterior', array['triceps','deltoide_lateral']::public.muscle_group[], 'maquina', 'compuesto', 'empuje_vertical', false, 8, 12, 105, 'Ajusta el asiento para que el agarre quede a la altura de los hombros, no por encima.'),
(null, 'Elevaciones frontales con mancuernas', '', 'deltoide_anterior', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_hombro', false, 12, 15, 60, 'Sube hasta la altura de los ojos y para. Si necesitas balancear el torso, pesa demasiado.'),
(null, 'Elevaciones frontales con disco', '', 'deltoide_anterior', array[]::public.muscle_group[], 'disco', 'aislamiento', 'aislamiento_hombro', false, 12, 15, 60, 'Disco agarrado a las tres y a las nueve. Recorrido continuo desde los muslos hasta los ojos.'),

-- ---------------------------------------------------- DELTOIDE LATERAL
(null, 'Elevaciones laterales con mancuernas', '', 'deltoide_lateral', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_hombro', false, 12, 20, 60, 'Sube hasta la horizontal, ni un dedo más. Codo ligeramente por delante y meñique un pelo más alto que el pulgar.'),
(null, 'Elevaciones laterales en polea', '', 'deltoide_lateral', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_hombro', true, 12, 20, 60, 'La polea da tensión también en la parte baja del recorrido, que es donde la mancuerna no pesa nada. Cruza el cable por delante.'),
(null, 'Elevaciones laterales en máquina', '', 'deltoide_lateral', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_hombro', false, 12, 20, 60, 'Empuja con la parte externa del brazo contra la almohadilla, no con la mano.'),
(null, 'Elevación lateral inclinado a una mano', '', 'deltoide_lateral', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_hombro', true, 12, 20, 60, 'Agárrate a algo y déjate caer hacia el lado contrario. Al inclinarte, el deltoide lateral trabaja desde más estirado.'),
(null, 'Remo al mentón con barra', '', 'deltoide_lateral', array['espalda_alta','biceps']::public.muscle_group[], 'barra', 'compuesto', 'aislamiento_hombro', false, 10, 15, 90, 'Agarre algo más ancho que los hombros y sube sólo hasta el pecho. Subir hasta la barbilla con agarre estrecho pinza el hombro.'),

-- -------------------------------------------------- DELTOIDE POSTERIOR
(null, 'Pájaros con mancuernas', '', 'deltoide_posterior', array['espalda_alta']::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_hombro', false, 12, 20, 60, 'Torso casi paralelo al suelo. Abre con los codos, no con las manos, y no juntes los omóplatos: eso lo convierte en trapecio.'),
(null, 'Pájaros en banco inclinado', '', 'deltoide_posterior', array['espalda_alta']::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_hombro', false, 12, 20, 60, 'Boca abajo en banco a 30°: el torso no se mueve, así que no puedes hacer trampa con impulso.'),
(null, 'Face pull en polea', '', 'deltoide_posterior', array['espalda_alta']::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_hombro', false, 15, 20, 60, 'Cuerda a la altura de la cara. Separa las manos al llegar y rota los antebrazos hacia atrás.'),
(null, 'Contractor inverso en máquina', '', 'deltoide_posterior', array['espalda_alta']::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_hombro', false, 12, 20, 60, 'Agarre neutro y brazos casi rectos. Es el pájaro sin tener que sostener el torso.'),
(null, 'Pájaros en polea cruzada', '', 'deltoide_posterior', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_hombro', false, 12, 20, 60, 'Agarra el cable contrario con cada mano y ábrete. Tensión constante en todo el arco.'),

-- --------------------------------------------------------------- BÍCEPS
(null, 'Curl con barra', '', 'biceps', array['antebrazo']::public.muscle_group[], 'barra', 'aislamiento', 'aislamiento_brazo', false, 8, 12, 90, 'Codos pegados al costado y quietos. Si los codos se van hacia delante al final, estás usando el hombro.'),
(null, 'Curl con barra Z', '', 'biceps', array['antebrazo']::public.muscle_group[], 'barra', 'aislamiento', 'aislamiento_brazo', false, 8, 12, 90, 'La barra Z reduce la tensión en la muñeca. Mismo gesto que con barra recta.'),
(null, 'Curl alterno con mancuernas', '', 'biceps', array['antebrazo']::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', false, 10, 14, 75, 'Gira la muñeca hacia fuera según subes (supinación): así el bíceps hace las dos cosas que sabe hacer.'),
(null, 'Curl martillo', '', 'biceps', array['antebrazo']::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', false, 10, 14, 75, 'Agarre neutro todo el recorrido. Trabaja el braquial, que es lo que empuja el bíceps hacia arriba y ensancha el brazo.'),
(null, 'Curl concentrado', '', 'biceps', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', true, 10, 15, 60, 'Codo apoyado en la cara interna del muslo. Es el que más aísla; úsalo al final, no para mover peso.'),
(null, 'Curl en banco Scott', '', 'biceps', array['antebrazo']::public.muscle_group[], 'barra', 'aislamiento', 'aislamiento_brazo', false, 8, 12, 90, 'No estires el codo del todo abajo si notas tirón: en el banco Scott la posición estirada es la más exigente.'),
(null, 'Curl en polea baja', '', 'biceps', array['antebrazo']::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_brazo', false, 10, 15, 75, 'Tensión constante de abajo a arriba, que es justo lo que le falta al curl con mancuerna.'),
(null, 'Curl inclinado con mancuernas', '', 'biceps', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', false, 10, 14, 75, 'Banco a 45° y brazos colgando detrás del cuerpo. El bíceps trabaja desde estirado, que es donde más crece.'),
(null, 'Curl araña', '', 'biceps', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', false, 10, 15, 75, 'Pecho apoyado en un banco inclinado, brazos colgando verticales. Imposible hacer trampa con la cadera.'),
(null, 'Curl martillo en polea con cuerda', '', 'biceps', array['antebrazo']::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_brazo', false, 12, 15, 75, 'Separa los extremos de la cuerda arriba para acabar el recorrido.'),

-- -------------------------------------------------------------- TRÍCEPS
(null, 'Press francés con barra Z', '', 'triceps', array[]::public.muscle_group[], 'barra', 'aislamiento', 'aislamiento_brazo', false, 8, 12, 90, 'Codos apuntando al techo y quietos. Baja la barra a la frente o un poco por detrás; los codos no se abren.'),
(null, 'Press francés con mancuernas', '', 'triceps', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', false, 10, 14, 90, 'Con mancuernas cada brazo trabaja por su cuenta y la muñeca va más cómoda que con barra.'),
(null, 'Extensión de tríceps en polea alta', '', 'triceps', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_brazo', false, 10, 15, 75, 'Codos pegados al costado. Sólo se mueve el antebrazo: si el hombro baja con el peso, estás haciendo un jalón.'),
(null, 'Extensión con cuerda en polea', '', 'triceps', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_brazo', false, 12, 15, 75, 'Abre la cuerda al final del recorrido y gira las palmas hacia el suelo para rematar la contracción.'),
(null, 'Extensión sobre la cabeza en polea', '', 'triceps', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_brazo', false, 10, 15, 75, 'De espaldas a la polea. Al trabajar con el brazo por encima de la cabeza estiras la porción larga, que es la que da volumen al brazo.'),
(null, 'Extensión sobre la cabeza con mancuerna', '', 'triceps', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', false, 10, 14, 90, 'Una mancuerna a dos manos, codos apuntando al frente. Baja hasta la nuca sin abrir los codos.'),
(null, 'Press cerrado con barra', '', 'triceps', array['pecho','deltoide_anterior']::public.muscle_group[], 'barra', 'compuesto', 'empuje_horizontal', false, 6, 10, 150, 'Manos a la anchura de los hombros, no más juntas: cerrar demasiado carga la muñeca sin dar más tríceps. Codos pegados al torso.'),
(null, 'Fondos en paralelas para tríceps', '', 'triceps', array['pecho','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_vertical', false, 6, 12, 120, 'Torso vertical y codos hacia atrás. Al revés que la versión de pecho, aquí no te inclines.'),
(null, 'Fondos entre bancos', '', 'triceps', array['deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_vertical', false, 10, 15, 90, 'Manos en el borde del banco y cadera pegada a él. No bajes más de 90° en el codo: el hombro queda en mala posición.'),
(null, 'Patada de tríceps con mancuerna', '', 'triceps', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'aislamiento_brazo', true, 12, 15, 60, 'Brazo pegado al costado y paralelo al suelo. Aguanta un segundo con el brazo estirado del todo.'),

-- ------------------------------------------------------------ ANTEBRAZO
(null, 'Curl de muñeca con barra', '', 'antebrazo', array[]::public.muscle_group[], 'barra', 'aislamiento', 'aislamiento_brazo', false, 15, 20, 60, 'Antebrazos apoyados en los muslos, palmas arriba. Deja que la barra ruede hasta los dedos y vuelve a cerrarla.'),
(null, 'Curl de muñeca inverso', '', 'antebrazo', array[]::public.muscle_group[], 'barra', 'aislamiento', 'aislamiento_brazo', false, 15, 20, 60, 'Palmas hacia abajo. Pesa mucho menos que la versión normal; no te frustres con la carga.'),
(null, 'Curl inverso con barra', '', 'antebrazo', array['biceps']::public.muscle_group[], 'barra', 'aislamiento', 'aislamiento_brazo', false, 12, 15, 75, 'Agarre prono. Trabaja el braquiorradial, el músculo que se marca en el canto del antebrazo.'),
(null, 'Paseo del granjero', '', 'antebrazo', array['espalda_alta','abdominales']::public.muscle_group[], 'mancuernas', 'compuesto', 'transporte', false, 1, 1, 120, 'Camina con el peso más alto que aguantes 30-45 segundos. Hombros atrás y abajo, sin encorvarte. Se registra por tiempo, no por repeticiones.'),
(null, 'Colgarse de la barra', '', 'antebrazo', array['dorsal']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'transporte', false, 1, 1, 90, 'Colgado, hombros activos. Se registra por tiempo. Es lo que arregla que el agarre falle antes que la espalda en las dominadas.'),

-- --------------------------------------------------------- ABDOMINALES
(null, 'Plancha frontal', '', 'abdominales', array['oblicuos','lumbares']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', false, 1, 1, 60, 'Se registra por tiempo. Mete la cadera y aprieta glúteo: una plancha bien hecha cansa en 30 segundos, no en tres minutos.'),
(null, 'Crunch en suelo', '', 'abdominales', array[]::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', false, 15, 25, 60, 'Sube sólo los hombros despegando vértebra a vértebra. No tires del cuello con las manos.'),
(null, 'Elevación de piernas colgado', '', 'abdominales', array['oblicuos','antebrazo']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false, 8, 15, 90, 'La clave es bascular la pelvis al final, no sólo levantar las piernas. Sin balanceo.'),
(null, 'Elevación de rodillas colgado', '', 'abdominales', array['antebrazo']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false, 12, 20, 75, 'Versión más fácil de la elevación de piernas. Sube las rodillas al pecho, no sólo a la cadera.'),
(null, 'Crunch en polea arrodillado', '', 'abdominales', array['oblicuos']::public.muscle_group[], 'polea', 'aislamiento', 'core', false, 12, 20, 75, 'Cuerda detrás de la cabeza, cadera fija. Redondea la espalda hacia el suelo; la cadera no se mueve.'),
(null, 'Rueda abdominal', '', 'abdominales', array['dorsal','lumbares']::public.muscle_group[], 'otro', 'compuesto', 'core', false, 8, 15, 90, 'Empieza de rodillas y sólo llega hasta donde puedas mantener la lumbar sin arquearse. Es más duro de lo que parece.'),
(null, 'Crunch abdominal en máquina', '', 'abdominales', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'core', false, 12, 20, 75, 'La máquina permite progresar con carga, que es lo que a los abdominales les suele faltar.'),
(null, 'Encogimientos en banco declinado', '', 'abdominales', array[]::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', false, 12, 20, 75, 'Sube sólo hasta unos 30-40°. Pasar de ahí ya es flexor de cadera.'),
(null, 'Hollow hold', '', 'abdominales', array[]::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', false, 1, 1, 60, 'Se registra por tiempo. Lumbar pegada al suelo; si se despega, sube más los brazos y las piernas.'),

-- ------------------------------------------------------------- OBLICUOS
(null, 'Plancha lateral', '', 'oblicuos', array['abdominales']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', true, 1, 1, 60, 'Se registra por tiempo. Cadera arriba y alineada; el cuerpo es una línea recta vista desde delante.'),
(null, 'Giro ruso', '', 'oblicuos', array['abdominales']::public.muscle_group[], 'disco', 'aislamiento', 'core', false, 15, 25, 60, 'Gira el torso entero, no sólo los brazos. Tocar el suelo a cada lado es una repetición completa.'),
(null, 'Leñador en polea', '', 'oblicuos', array['abdominales','gluteo']::public.muscle_group[], 'polea', 'compuesto', 'core', true, 12, 15, 75, 'De alto a bajo en diagonal, girando desde el tronco y pivotando el pie de atrás. Brazos casi rectos.'),
(null, 'Pallof press', '', 'oblicuos', array['abdominales']::public.muscle_group[], 'polea', 'aislamiento', 'core', true, 10, 15, 60, 'De lado a la polea, extiende los brazos y resiste el giro. Es un anti-rotación: lo que entrena es que NO te muevas.'),
(null, 'Inclinación lateral con mancuerna', '', 'oblicuos', array[]::public.muscle_group[], 'mancuernas', 'aislamiento', 'core', true, 12, 20, 60, 'Una sola mancuerna. Baja por el costado y sube; el torso no se va hacia delante ni hacia atrás.'),

-- ------------------------------------------------------------- LUMBARES
(null, 'Hiperextensiones en banco romano', '', 'lumbares', array['gluteo','isquiotibiales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_cadera', false, 12, 20, 90, 'Sube sólo hasta la línea del cuerpo; pasar de ahí es hiperextender de verdad la lumbar. Aprieta glúteo arriba.'),
(null, 'Extensión lumbar en máquina', '', 'lumbares', array['gluteo']::public.muscle_group[], 'maquina', 'aislamiento', 'dominante_cadera', false, 12, 15, 90, 'Permite cargar la lumbar de forma progresiva y segura, que es la mejor prevención de molestias.'),
(null, 'Superman en suelo', '', 'lumbares', array['gluteo','espalda_alta']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'dominante_cadera', false, 12, 20, 60, 'Boca abajo, levanta brazos y piernas a la vez y aguanta dos segundos. Sin material y sin excusa.'),

-- --------------------------------------------------------------- GLÚTEO
(null, 'Hip thrust con barra', '', 'gluteo', array['isquiotibiales','cuadriceps']::public.muscle_group[], 'barra', 'compuesto', 'dominante_cadera', false, 8, 12, 150, 'Espalda apoyada bajo el omóplato, barbilla metida. Arriba, la cadera llega a la extensión completa y aguantas un segundo.'),
(null, 'Puente de glúteo en suelo', '', 'gluteo', array['isquiotibiales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_cadera', false, 15, 20, 75, 'Talones cerca del culo. Empuja con los talones y aprieta arriba; la lumbar no se arquea.'),
(null, 'Hip thrust en máquina', '', 'gluteo', array['isquiotibiales']::public.muscle_group[], 'maquina', 'compuesto', 'dominante_cadera', false, 10, 15, 120, 'Más cómodo de cargar que con barra y sin tener que montar nada.'),
(null, 'Zancada inversa', '', 'gluteo', array['cuadriceps','isquiotibiales']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_rodilla', true, 10, 12, 105, 'Al dar el paso hacia atrás en vez de hacia delante, la rodilla sufre menos y el glúteo trabaja más.'),
(null, 'Patada de glúteo en polea', '', 'gluteo', array['isquiotibiales']::public.muscle_group[], 'polea', 'aislamiento', 'dominante_cadera', true, 12, 20, 60, 'Tobillera en el pie, torso inclinado y estable. Lleva la pierna atrás sin arquear la lumbar para ganar recorrido.'),
(null, 'Abducción de cadera en máquina', '', 'gluteo', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 15, 20, 60, 'Inclina el torso hacia delante: así el glúteo medio trabaja en mejor posición que sentado recto.'),
(null, 'Abducción de cadera en polea', '', 'gluteo', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_pierna', true, 12, 20, 60, 'Tobillera en el tobillo de fuera. Lleva la pierna al lado sin girar la cadera.'),
(null, 'Subida al cajón', '', 'gluteo', array['cuadriceps','isquiotibiales']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_rodilla', true, 10, 12, 105, 'Sube empujando con el pie de arriba, sin impulsarte con el de abajo. Cajón a la altura de la rodilla o algo más.'),

-- ----------------------------------------------------------- CUÁDRICEPS
(null, 'Sentadilla trasera con barra', '', 'cuadriceps', array['gluteo','isquiotibiales','lumbares']::public.muscle_group[], 'barra', 'compuesto', 'dominante_rodilla', false, 5, 8, 210, 'Baja hasta que la cadera pase por debajo de la rodilla si tu movilidad lo permite. Rodillas siguiendo la línea de los pies, no hacia dentro.'),
(null, 'Sentadilla frontal', '', 'cuadriceps', array['gluteo','abdominales']::public.muscle_group[], 'barra', 'compuesto', 'dominante_rodilla', false, 5, 8, 180, 'Codos altos toda la serie: en cuanto bajan, la barra rueda hacia delante. Más cuádriceps y menos lumbar que la trasera.'),
(null, 'Sentadilla búlgara', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_rodilla', true, 8, 12, 120, 'Pie de atrás en un banco. Cuanto más adelantes el pie de delante, más glúteo; cuanto más cerca, más cuádriceps.'),
(null, 'Prensa de piernas', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'maquina', 'compuesto', 'dominante_rodilla', false, 10, 15, 150, 'Baja hasta que la lumbar esté a punto de despegarse del respaldo, no más. No bloquees las rodillas de golpe arriba.'),
(null, 'Extensión de cuádriceps en máquina', '', 'cuadriceps', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 12, 20, 75, 'Aguanta un segundo arriba con la pierna estirada. Es el único aislamiento real del cuádriceps.'),
(null, 'Sentadilla hack en máquina', '', 'cuadriceps', array['gluteo']::public.muscle_group[], 'maquina', 'compuesto', 'dominante_rodilla', false, 8, 12, 150, 'Pies algo más adelantados que la cadera. Mucho cuádriceps con la espalda descargada.'),
(null, 'Zancadas caminando', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_rodilla', true, 10, 14, 105, 'Paso largo y rodilla de atrás casi al suelo. Torso vertical; si te inclinas, se va al glúteo.'),
(null, 'Sentadilla goblet', '', 'cuadriceps', array['gluteo','abdominales']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_rodilla', false, 10, 15, 105, 'Mancuerna pegada al pecho. El contrapeso te deja bajar más recto: es la mejor forma de aprender a sentadillear.'),
(null, 'Sentadilla en multipower', '', 'cuadriceps', array['gluteo']::public.muscle_group[], 'multipower', 'compuesto', 'dominante_rodilla', false, 8, 12, 150, 'Con los pies adelantados carga más el cuádriceps. La guía sustituye al equilibrio, no a la técnica.'),
(null, 'Sissy squat', '', 'cuadriceps', array[]::public.muscle_group[], 'peso_corporal', 'aislamiento', 'aislamiento_pierna', false, 10, 15, 90, 'Rodillas hacia delante y cadera en línea con el torso. Estira el recto femoral como ningún otro; agárrate a algo.'),

-- ------------------------------------------------------- ISQUIOTIBIALES
(null, 'Peso muerto rumano con barra', '', 'isquiotibiales', array['gluteo','lumbares','espalda_alta']::public.muscle_group[], 'barra', 'compuesto', 'dominante_cadera', false, 6, 10, 180, 'Lleva la cadera hacia atrás con las rodillas casi fijas. Baja sólo hasta donde la espalda siga recta: eso suele ser media espinilla.'),
(null, 'Peso muerto convencional', '', 'isquiotibiales', array['gluteo','lumbares','espalda_alta','antebrazo']::public.muscle_group[], 'barra', 'compuesto', 'dominante_cadera', false, 3, 6, 240, 'La barra pegada a la pierna todo el recorrido. Empuja el suelo con los pies en vez de tirar con la espalda.'),
(null, 'Peso muerto piernas rígidas con mancuernas', '', 'isquiotibiales', array['gluteo','lumbares']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_cadera', false, 8, 12, 150, 'Mancuernas pegadas a las piernas. Más rango que con barra porque no chocan con el suelo.'),
(null, 'Curl femoral tumbado', '', 'isquiotibiales', array['gemelos']::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 10, 15, 90, 'Cadera pegada al banco. Si la despegas para subir más peso, te llevas el ejercicio a la lumbar.'),
(null, 'Curl femoral sentado', '', 'isquiotibiales', array['gemelos']::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 10, 15, 90, 'Sentado el isquio trabaja desde más estirado que tumbado, y eso se nota.'),
(null, 'Curl nórdico', '', 'isquiotibiales', array['gluteo']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'aislamiento_pierna', false, 5, 8, 120, 'Pies sujetos, cuerpo recto, y bajas frenando todo lo que puedas. Es brutal: empieza con 3 repeticiones.'),
(null, 'Buenos días con barra', '', 'isquiotibiales', array['gluteo','lumbares']::public.muscle_group[], 'barra', 'compuesto', 'dominante_cadera', false, 8, 12, 150, 'Barra en la espalda como en sentadilla. Carga poco: el brazo de palanca sobre la lumbar es largo.'),
(null, 'Peso muerto a una pierna', '', 'isquiotibiales', array['gluteo','lumbares']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_cadera', true, 8, 12, 105, 'La pierna libre va hacia atrás en línea con el torso. Cadera cuadrada, sin abrirse hacia el lado.'),

-- ------------------------------------------------------------- ADUCTORES
(null, 'Aducción de cadera en máquina', '', 'aductores', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 12, 20, 60, 'Controla la vuelta: la fase de estiramiento es donde el aductor se lesiona y donde se fortalece.'),
(null, 'Sentadilla sumo con mancuerna', '', 'aductores', array['cuadriceps','gluteo']::public.muscle_group[], 'mancuernas', 'compuesto', 'dominante_rodilla', false, 10, 15, 120, 'Pies muy abiertos y punteras hacia fuera. Baja recto entre los talones.'),
(null, 'Sentadilla cosaco', '', 'aductores', array['cuadriceps','gluteo']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_rodilla', true, 8, 12, 90, 'Peso sobre una pierna flexionada y la otra estirada al lado. Trabaja fuerza y movilidad a la vez.'),
(null, 'Aducción en polea', '', 'aductores', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_pierna', true, 12, 20, 60, 'Tobillera en la pierna de dentro. Cruza la pierna por delante de la otra al final.'),

-- -------------------------------------------------------------- GEMELOS
(null, 'Elevación de talones de pie', '', 'gemelos', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 12, 20, 75, 'Rodilla estirada para que trabaje el gemelo. Baja hasta el estiramiento completo y sube hasta arriba del todo: medio recorrido es media serie.'),
(null, 'Elevación de talones sentado', '', 'gemelos', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 15, 20, 60, 'Con la rodilla doblada el gemelo queda corto y trabaja el sóleo, que es el músculo de debajo. Hacen falta los dos.'),
(null, 'Elevación de talones en prensa', '', 'gemelos', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', false, 12, 20, 75, 'Puntas en el borde de la plataforma, rodillas casi estiradas pero sin bloquear.'),
(null, 'Elevación de talones a una pierna', '', 'gemelos', array[]::public.muscle_group[], 'peso_corporal', 'aislamiento', 'aislamiento_pierna', true, 12, 20, 60, 'En un escalón, agarrado a la pared. Sin material y con recorrido completo.'),
(null, 'Elevación de talones en multipower', '', 'gemelos', array[]::public.muscle_group[], 'multipower', 'aislamiento', 'aislamiento_pierna', false, 12, 20, 75, 'Con un disco bajo las punteras para ganar recorrido. Pausa de un segundo abajo.')

on conflict do nothing;
