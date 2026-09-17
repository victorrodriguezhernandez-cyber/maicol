-- Catálogo: máquinas y variantes de gimnasio.
--
-- Cierra los huecos que quedaban: los ejercicios asistidos (los que
-- permiten hacer dominadas y fondos a quien no llega a una), las
-- variantes de agarre y ángulo que cualquiera encuentra en su gimnasio, y
-- las máquinas que faltaban.
--
-- Los nombres dicen qué cambia respecto al ejercicio base — el agarre, el
-- ángulo, la máquina — porque en el selector se leen seguidos y "jalón" a
-- secas cuatro veces no distingue nada.

insert into public.exercises (
  user_id, name, name_normalized, primary_muscle, secondary_muscles,
  equipment, mechanic, pattern, is_unilateral,
  tracks_weight, tracks_reps, tracks_duration,
  default_reps_min, default_reps_max, default_duration_min, default_duration_max,
  default_rest_seconds, is_common, cues, how_to, mistakes
) values
(null, 'Dominadas asistidas en máquina', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'maquina', 'compuesto', 'tiron_vertical', false,
 true, true, false, 8, 12, null, null, 120, true,
 'La máquina te QUITA peso: cuanto más pongas, más fácil. Para progresar hay que bajar el número, no subirlo.',
 'Ajusta el peso de asistencia: empieza con bastante y ve viendo.
Apoya las rodillas o los pies en la plataforma y agarra la barra con las palmas hacia delante.
Deja que la plataforma te sostenga con los brazos estirados y los hombros relajados arriba.
Baja los omóplatos y tira llevando los codos a las costillas hasta que el pecho llegue a la altura de las manos.
Baja controlando hasta estirar.',
 'Apuntar el peso de asistencia como si fuera carga: en esta máquina, 40 kg es MÁS fácil que 20. Anota siempre el mismo número y fíjate en que baje con las semanas.
Dejar que la plataforma te empuje arriba: el recorrido lo haces tú.'),

(null, 'Fondos asistidos en máquina', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'maquina', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 8, 12, null, null, 120, false,
 'Igual que las dominadas asistidas: el peso te ayuda, así que progresar es bajarlo.',
 'Pon el peso de asistencia y apoya las rodillas en la plataforma.
Agarra las empuñaduras con los brazos estirados.
Inclina el torso hacia delante si buscas pecho, o mantenlo vertical si buscas tríceps.
Baja hasta que los hombros queden a la altura de los codos.
Empuja hasta estirar los brazos.',
 'Confundir el número con carga: menos asistencia es más fuerza.
Bajar hasta el fondo antes de tener el hombro acostumbrado.'),

(null, 'Jalón con agarre neutro en polea', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'polea', 'compuesto', 'tiron_vertical', false,
 true, true, false, 8, 12, null, null, 105, false,
 'Palmas enfrentadas con una barra de agarre paralelo. La variante más amable con el hombro.',
 'Pon una barra de agarre paralelo o dos asas neutras en la polea alta.
Siéntate con los muslos sujetos, pecho alto, brazos estirados.
Tira llevando los codos hacia abajo y pegados al torso hasta que las manos lleguen al pecho.
Vuelve controlando hasta estirar y dejar que los hombros suban.',
 'Inclinarse mucho hacia atrás.
Encoger los hombros al final.'),

(null, 'Jalón con agarre supino en polea', '', 'dorsal', array['biceps']::public.muscle_group[], 'polea', 'compuesto', 'tiron_vertical', false,
 true, true, false, 8, 12, null, null, 105, false,
 'Palmas hacia ti con la barra recta. Más bíceps y más recorrido que el agarre prono.',
 'Coge la barra recta de la polea alta con las palmas hacia ti, a la anchura de los hombros.
Siéntate con los muslos sujetos y los brazos estirados arriba.
Tira llevando los codos hacia abajo y algo hacia delante, hasta que la barra llegue a la parte alta del pecho.
Vuelve controlando hasta estirar.',
 'Tirar sólo con el bíceps doblando el codo sin bajar el hombro.
Echarse hacia atrás para poder tirar más peso.'),

(null, 'Remo con pecho apoyado en máquina', '', 'dorsal', array['espalda_alta','biceps','deltoide_posterior']::public.muscle_group[], 'maquina', 'compuesto', 'tiron_horizontal', false,
 true, true, false, 8, 12, null, null, 105, false,
 'Con el pecho apoyado la lumbar no trabaja, así que puedes llegar cerca del fallo sin riesgo.',
 'Ajusta el asiento para que las asas queden a la altura de la parte baja del pecho.
Siéntate con el pecho contra el soporte y los pies firmes.
Agarra las asas con los brazos estirados.
Tira llevando los codos hacia atrás hasta que las manos pasen la línea del torso.
Vuelve controlando hasta estirar los brazos.',
 'Separar el pecho del soporte para tirar más peso: el soporte es justo lo que hace seguro este remo.
Encoger los hombros.'),

(null, 'Remo en polea baja con agarre ancho', '', 'espalda_alta', array['dorsal','deltoide_posterior']::public.muscle_group[], 'polea', 'compuesto', 'tiron_horizontal', false,
 true, true, false, 10, 15, null, null, 105, false,
 'Con agarre ancho y codos abiertos, el trabajo se va a la espalda alta en vez del dorsal.',
 'Pon una barra ancha en la polea baja y siéntate con los pies en los apoyos.
Espalda recta, pecho alto, brazos estirados.
Tira llevando los codos hacia atrás y ABIERTOS, hasta que la barra llegue a la parte alta del abdomen.
Junta los omóplatos al final y vuelve controlando.',
 'Pegar los codos al torso: entonces es el remo de dorsal, que ya existe. Aquí se abren a propósito.
Balancear el torso.'),

(null, 'Pull-over en máquina', '', 'dorsal', array['abdominales']::public.muscle_group[], 'maquina', 'aislamiento', 'tiron_vertical', false,
 true, true, false, 10, 15, null, null, 90, false,
 'El único aislamiento real del dorsal: el codo no se dobla, así que el bíceps no puede ayudar.',
 'Ajusta el asiento para que los hombros queden alineados con el eje de giro.
Siéntate con el cinturón puesto si la máquina lo tiene y apoya los codos o los antebrazos en las almohadillas.
Empuja hacia abajo y adelante con los codos, en arco, hasta que las manos lleguen a los muslos.
Vuelve controlando hasta que los brazos suban por encima de la cabeza.',
 'Empujar con las manos: los codos son el punto de fuerza.
Arquear la lumbar al final del recorrido.'),

(null, 'Press de hombro en multipower', '', 'deltoide_anterior', array['triceps','deltoide_lateral']::public.muscle_group[], 'multipower', 'compuesto', 'empuje_vertical', false,
 true, true, false, 6, 10, null, null, 120, false,
 'La guía quita el equilibrio, así que puedes centrarte en empujar. Coloca el banco para que la barra caiga sobre la clavícula.',
 'Pon un banco con respaldo casi vertical dentro del multipower.
Ajústalo para que la barra, al bajar, llegue a la altura de la clavícula.
Agarra algo más abierto que los hombros, gira la barra para liberarla y empuja hacia arriba.
Baja controlando hasta la clavícula.
Pon los seguros a esa altura antes de la última serie.',
 'Colocar el banco sin comprobar dónde cae la barra: con la guía fija, el hombro paga cada centímetro de desalineación.
Bajar la barra por detrás del cuello.'),

(null, 'Press de pecho convergente en máquina', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'maquina', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 8, 12, null, null, 105, false,
 'Los brazos de la máquina se juntan al empujar, así que el pecho se contrae más que en un press recto.',
 'Ajusta el asiento para que las empuñaduras queden a la altura de la mitad del pecho.
Siéntate con la espalda apoyada y los omóplatos juntos y hundidos.
Empuja hacia delante dejando que las manos se acerquen entre sí.
Aprieta un segundo con las manos juntas y vuelve controlando hasta notar estiramiento.',
 'Separar la espalda del respaldo.
No aprovechar el final del recorrido: la convergencia es lo que distingue esta máquina, así que junta las manos del todo.'),

(null, 'Aperturas en máquina peck deck', '', 'pecho', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'empuje_horizontal', false,
 true, true, false, 10, 15, null, null, 75, false,
 'La versión con los brazos estirados en almohadillas, no con empuñaduras: el codo no puede hacer trampa.',
 'Ajusta el asiento para que los brazos queden a la altura de los hombros.
Siéntate con la espalda apoyada y apoya los antebrazos en las almohadillas.
Junta los brazos por delante hasta que las almohadillas casi se toquen.
Aprieta un segundo y vuelve controlando hasta notar estiramiento en el pecho.',
 'Empujar con las manos en vez de con los antebrazos.
Dejar que el peso te abra de golpe: es la posición donde el hombro está más abierto.'),

(null, 'Press de pecho a una mano en polea', '', 'pecho', array['triceps','abdominales','oblicuos']::public.muscle_group[], 'polea', 'compuesto', 'empuje_horizontal', true,
 true, true, false, 10, 15, null, null, 90, false,
 'A una mano, el abdomen tiene que impedir que el torso gire. Dos ejercicios en uno.',
 'Pon la polea a la altura del pecho con un agarre de una mano.
Dale la espalda a la torre y coge el agarre con esa mano, codo a 45° del torso.
Da un paso adelante, pies separados para tener base, abdomen apretado.
Empuja hacia delante hasta estirar el brazo, sin girar el torso.
Vuelve controlando y cambia de lado al acabar.',
 'Girar el torso para acompañar el empuje: resistir el giro es la mitad del ejercicio.
Dar un paso tan corto que no haya tensión al principio.'),

(null, 'Curl de bíceps en máquina', '', 'biceps', array['antebrazo']::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_brazo', false,
 true, true, false, 10, 15, null, null, 75, false,
 'La máquina fija los codos, así que no puedes balancearte. Buen último ejercicio del día de brazo.',
 'Ajusta el asiento para que los codos queden alineados con el eje de giro y los brazos apoyados en el atril.
Agarra las empuñaduras con las palmas hacia arriba y los brazos estirados.
Sube flexionando los codos hasta arriba.
Baja controlando hasta estirar del todo, sin soltar la tensión de golpe.',
 'Levantar los codos del apoyo en las últimas.
Soltar el peso de golpe abajo: es la posición donde el bíceps está más estirado.'),

(null, 'Extensión de tríceps en máquina', '', 'triceps', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_brazo', false,
 true, true, false, 10, 15, null, null, 75, false,
 'Los codos apoyados no se pueden mover, así que el tríceps no tiene dónde esconderse.',
 'Ajusta el asiento para que los codos queden alineados con el eje de giro.
Siéntate con la espalda apoyada y los codos en el soporte.
Agarra las empuñaduras y estira los brazos hasta que queden rectos.
Aprieta un segundo y vuelve controlando.',
 'Separar la espalda del respaldo para empujar.
No estirar del todo: la contracción completa es con el brazo recto.'),

(null, 'Curl femoral de pie a una pierna', '', 'isquiotibiales', array['gemelos']::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', true,
 true, true, false, 10, 15, null, null, 75, false,
 'Deja ver y corregir la diferencia entre piernas, que en el curl con las dos suele quedar tapada.',
 'Ajusta la almohadilla de la máquina justo por encima del talón.
Ponte de pie apoyado en el soporte, con la pierna de trabajo detrás de la almohadilla.
Sujétate con las manos y mantén la cadera quieta.
Dobla la rodilla llevando el talón al culo y aprieta un segundo.
Baja controlando hasta estirar. Haz todas las repeticiones y cambia.',
 'Balancear la cadera hacia delante para ayudarse: la cadera se queda quieta.
Cargar el mismo peso que con las dos piernas y dividirlo mal: empieza bajo, esta versión sale menos.'),

(null, 'Prensa horizontal de piernas', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'maquina', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 10, 15, null, null, 120, false,
 'La prensa sentado, con la espalda vertical. Menos compresión lumbar que la inclinada.',
 'Ajusta el asiento para que, con las rodillas dobladas a 90°, los pies queden planos en la plataforma.
Siéntate con la espalda y la cadera pegadas al respaldo.
Empuja con todo el pie hasta casi estirar las piernas, sin bloquear.
Vuelve controlando hasta que las rodillas queden a 90° o hasta donde la cadera siga apoyada.',
 'Acercar tanto el asiento que la cadera se despegue al volver.
Bloquear las rodillas de golpe.'),

(null, 'Prensa de piernas a una pierna', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'maquina', 'compuesto', 'dominante_rodilla', true,
 true, true, false, 8, 15, null, null, 105, false,
 'Para igualar piernas cargando de verdad, sin el equilibrio que pide la búlgara.',
 'Siéntate en la prensa con la espalda y la cadera pegadas al respaldo.
Pon un pie en el centro de la plataforma y deja el otro apoyado a un lado, fuera.
Suelta los seguros y baja doblando la rodilla hasta 90°, o hasta donde la cadera siga apoyada.
Empuja con todo el pie hasta casi estirar.
Haz todas las repeticiones y cambia.',
 'Poner el pie en un lado de la plataforma: va en el centro, o la máquina se ladea.
Empezar con la mitad del peso de las dos piernas: sale bastante menos de la mitad.'),

(null, 'Sentadilla belt squat', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'maquina', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 8, 15, null, null, 120, false,
 'El peso cuelga de la cadera, no de la espalda. Es la sentadilla para cuando la lumbar está cargada.',
 'Ponte el cinturón alrededor de la cadera y engánchalo al peso de la máquina.
Colócate en la plataforma con los pies a la anchura de los hombros y agárrate a los soportes.
Baja llevando la cadera atrás y las rodillas afuera, con el torso vertical.
Baja hasta que la cadera pase la rodilla y sube empujando el suelo.',
 'Ponerse el cinturón en la cintura en vez de en la cadera: aprieta las costillas y no deja bajar.
Tirar con los brazos de los soportes: son sólo para equilibrar.'),

(null, 'Hack squat inversa', '', 'gluteo', array['isquiotibiales','cuadriceps']::public.muscle_group[], 'maquina', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 8, 12, null, null, 120, false,
 'De cara a la máquina en vez de de espaldas: el trabajo se va al glúteo y al isquio.',
 'Colócate en la hack de CARA a la máquina, con el pecho contra el respaldo y los hombros bajo las almohadillas.
Pies a la anchura de los hombros en la plataforma, algo adelantados.
Suelta los seguros y baja llevando la cadera atrás, con el pecho apoyado.
Baja hasta notar estiramiento en el glúteo y sube empujando el suelo.',
 'Separar el pecho del respaldo: la lumbar recoge la palanca.
Cargar como en la hack normal: en esta posición sale menos.'),

(null, 'Extensión de cuádriceps a una pierna', '', 'cuadriceps', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'aislamiento_pierna', true,
 true, true, false, 10, 15, null, null, 75, false,
 'Enseña qué pierna va por detrás. El número de una y de otra no suele ser el mismo.',
 'Ajusta el respaldo y la almohadilla igual que en la extensión normal, sobre la parte baja de la espinilla.
Siéntate con una sola pierna dentro de la máquina y la otra colgando o apoyada.
Estira la pierna hasta que quede recta y aprieta un segundo arriba.
Baja controlando hasta doblar la rodilla del todo.
Haz todas las repeticiones y cambia.',
 'Ladear la cadera para empujar con el tronco.
Levantar el culo del asiento en las últimas.'),

(null, 'Encogimientos en máquina', '', 'espalda_alta', array[]::public.muscle_group[], 'maquina', 'aislamiento', 'tiron_vertical', false,
 true, true, false, 12, 20, null, null, 60, false,
 'Sin agarre que ceda, el trapecio puede llegar al fallo sin que el antebrazo le corte la serie.',
 'Ajusta la máquina o coge las asas con los brazos estirados a los lados.
De pie o sentado, con los hombros relajados hacia abajo.
Sube los hombros rectos hacia las orejas y aguanta un segundo.
Baja controlando hasta soltar los hombros del todo.',
 'Rodar los hombros.
Doblar los codos.'),

(null, 'Rotación externa en polea', '', 'deltoide_posterior', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_hombro', true,
 true, true, false, 12, 20, null, null, 45, false,
 'Para el manguito rotador, con tensión constante. Poco peso siempre.',
 'Pon la polea a la altura del codo y ponte de lado a la torre.
Coge el agarre con la mano más lejana y pega el codo al costado, doblado a 90°.
Pon una toalla enrollada entre el codo y el cuerpo si se te separa.
Gira el antebrazo hacia fuera sin mover el codo, hasta donde llegue.
Vuelve controlando. Haz todas las repeticiones y cambia.',
 'Separar el codo del costado: el hombro gira y el manguito sale.
Poner peso: el manguito es pequeño; si necesitas impulso, sobra carga.'),

(null, 'Elevación frontal en polea baja', '', 'deltoide_anterior', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_hombro', false,
 true, true, false, 12, 15, null, null, 60, false,
 'Con polea hay tensión al principio del recorrido, donde la mancuerna casi no pesa.',
 'Pon la polea en el punto más bajo con una barra o un agarre de una mano.
Dale la espalda a la torre y coge el agarre por delante de los muslos, brazos estirados.
Da un paso adelante para tener tensión.
Sube los brazos hacia delante hasta la altura de los hombros.
Baja controlando.',
 'Subir por encima del hombro: el trapecio entra.
Balancear el torso atrás para dar impulso.'),

(null, 'Crunch en máquina con carga', '', 'abdominales', array['oblicuos']::public.muscle_group[], 'maquina', 'aislamiento', 'core', false,
 true, true, false, 10, 15, null, null, 75, false,
 'El abdomen responde a la carga progresiva igual que cualquier músculo: aquí se le puede poner peso de verdad.',
 'Ajusta el asiento para que el eje de giro quede a la altura del abdomen y elige un peso con el que lleguen 12-15.
Siéntate y sujeta las asas o cruza los brazos sobre las almohadillas.
Enrolla el torso llevando las costillas hacia la cadera.
Aprieta abajo un segundo y vuelve controlando hasta estirar la columna.',
 'Doblar la cadera en vez de la columna.
Empujar con los brazos: son el punto de apoyo.'),

(null, 'Rotación de torso en máquina', '', 'oblicuos', array['abdominales']::public.muscle_group[], 'maquina', 'aislamiento', 'core', true,
 true, true, false, 12, 20, null, null, 60, false,
 'Poco peso y mucho control: la columna rotando bajo carga alta es el gesto que más lesiona.',
 'Ajusta el asiento y sujeta las piernas para que la cadera no se mueva.
Siéntate recto y agarra las asas contra el pecho.
Gira el torso hacia un lado sin mover la cadera, hasta el final del recorrido cómodo.
Vuelve controlando y haz el otro lado.',
 'Poner mucho peso: es el ejercicio del gimnasio donde una lesión lumbar es más fácil y más tonta.
Girar la cadera con el torso: la cadera queda fija, si no el ejercicio no aísla nada.'),

(null, 'Curl de muñeca en polea', '', 'antebrazo', array[]::public.muscle_group[], 'polea', 'aislamiento', 'aislamiento_brazo', false,
 true, true, false, 12, 20, null, null, 45, false,
 'Con polea la muñeca tiene tensión en todo el recorrido, y la barra no se escapa a los dedos.',
 'Pon una barra recta en la polea baja y siéntate en un banco delante.
Coge la barra con las palmas hacia arriba y apoya los antebrazos en los muslos, con las manos por delante de las rodillas.
Baja las muñecas dejando que la barra ruede hacia los dedos.
Sube las muñecas todo lo que puedas y aprieta.',
 'Mover los antebrazos de los muslos.
Recorrido corto: el rango incluye dejar rodar la barra a los dedos.'),

(null, 'Sentadilla con barra sumo', '', 'aductores', array['gluteo','cuadriceps']::public.muscle_group[], 'barra', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 6, 10, null, null, 150, false,
 'Pies muy abiertos y puntas hacia fuera: la cara interna del muslo y el glúteo hacen mucho más que en la normal.',
 'Pon la barra en el rack y apóyala en el trapecio como en una sentadilla normal.
Saca la barra y separa los pies bastante más que los hombros, con las puntas giradas hacia fuera unos 30-45°.
Baja llevando la cadera abajo y entre los talones, con el torso lo más vertical posible y las rodillas siguiendo la línea de las puntas.
Baja hasta notar estiramiento en la cara interna del muslo y sube empujando el suelo.',
 'Abrir los pies sin girar las puntas: la rodilla gira por dentro y el aductor no se estira.
Bajar más de lo que da tu cadera: la pelvis se mete y la lumbar se redondea.');
