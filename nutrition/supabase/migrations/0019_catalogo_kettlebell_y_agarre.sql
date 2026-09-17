-- Catálogo: kettlebell, agarre y accesorios.
--
-- El bloque de agarre existe porque el antebrazo era el músculo con menos
-- ejercicios del catálogo (cinco) y es el que limita medio entreno de
-- espalda: si la mano se abre, la serie termina aunque al dorsal le
-- quedaran dos repeticiones.
--
-- El hand grip y el pinza de discos van con `equipment = 'otro'`: no son
-- barra ni mancuerna, y el motor de progresión lo trata como material sin
-- salto mínimo definido (`incrementoMinimo` devuelve 0), así que no
-- inventa subidas de peso donde no hay escalones.

insert into public.exercises (
  user_id, name, name_normalized, primary_muscle, secondary_muscles,
  equipment, mechanic, pattern, is_unilateral,
  tracks_weight, tracks_reps, tracks_duration,
  default_reps_min, default_reps_max, default_duration_min, default_duration_max,
  default_rest_seconds, is_common, cues, how_to, mistakes
) values
-- ------------------------------------------------------- KETTLEBELL
(null, 'Swing ruso con kettlebell', '', 'gluteo', array['isquiotibiales','lumbares','espalda_alta']::public.muscle_group[], 'kettlebell', 'compuesto', 'dominante_cadera', false,
 true, true, false, 10, 20, null, null, 90, false,
 'El swing lo hace la cadera, no los brazos. La pesa llega a la altura del pecho y ahí se para.',
 'Pon la kettlebell en el suelo a un paso por delante de ti, pies a la anchura de los hombros.
Lleva la cadera atrás, espalda recta, y agarra el asa con las dos manos.
Inclina la pesa hacia ti y lánzala hacia atrás entre las piernas, pasando por encima de las rodillas.
Empuja la cadera hacia delante con fuerza y aprieta el glúteo: la pesa sale disparada hacia delante sola.
Deja que suba hasta la altura del pecho, con los brazos relajados, y que vuelva a caer entre las piernas.
Cada ida y vuelta es una repetición.',
 'Levantar la pesa con los brazos: es un peso muerto malo, no un swing. La pesa vuela porque la cadera la empuja.
Hacerlo como una sentadilla, doblando mucho las rodillas: el gesto es de cadera atrás, no de bajar.
Redondear la espalda en la parte de atrás del recorrido.
Pasar la pesa por debajo de las rodillas: tiene que ir por encima, pegada a la entrepierna.'),

(null, 'Swing americano con kettlebell', '', 'gluteo', array['isquiotibiales','deltoide_anterior','espalda_alta']::public.muscle_group[], 'kettlebell', 'compuesto', 'dominante_cadera', false,
 true, true, false, 8, 15, null, null, 105, false,
 'Igual que el ruso pero la pesa sube por encima de la cabeza. Pide hombro y control extra.',
 'Haz el swing igual que el ruso: cadera atrás, pesa entre las piernas, empuje de cadera.
Deja que la pesa siga subiendo hasta quedar por encima de la cabeza, con los brazos estirados.
Aprieta abdomen y glúteo arriba para no arquear la lumbar.
Deja que caiga y vuelva entre las piernas.',
 'Arquear la lumbar arriba: es el fallo casi universal de esta variante y es la razón por la que muchos entrenadores sólo enseñan el ruso.
Tirar con los brazos para llegar arriba.'),

(null, 'Clean con kettlebell', '', 'gluteo', array['espalda_alta','deltoide_anterior','antebrazo']::public.muscle_group[], 'kettlebell', 'compuesto', 'dominante_cadera', true,
 true, true, false, 5, 10, null, null, 105, false,
 'Llevar la pesa del suelo al hombro en un movimiento. Bien hecho no golpea la muñeca.',
 'Kettlebell en el suelo entre los pies, un poco por delante.
Lleva la cadera atrás y agarra el asa con una mano, espalda recta.
Empuja la cadera hacia delante y tira de la pesa cerca del cuerpo, con el codo pegado al costado.
Cuando la pesa llegue al pecho, mete la mano por dentro del asa y déjala rodar hasta apoyarse en el antebrazo.
Termina con la pesa en el hombro, antebrazo vertical.
Baja invirtiendo el movimiento y repite. Cambia de mano al acabar.',
 'Dejar que la pesa dé la vuelta por fuera y golpee la muñeca: hay que meter la mano por dentro del asa, no dejar que la pesa la rodee.
Separar el codo del cuerpo: la pesa se aleja y el golpe es peor.
Levantarla con el brazo: la sube la cadera.'),

(null, 'Press con kettlebell', '', 'deltoide_anterior', array['triceps','abdominales']::public.muscle_group[], 'kettlebell', 'compuesto', 'empuje_vertical', true,
 true, true, false, 5, 10, null, null, 105, false,
 'La pesa cuelga por detrás del antebrazo, así que el hombro trabaja distinto que con mancuerna.',
 'Lleva la kettlebell al hombro (con un clean o con las dos manos), apoyada en el antebrazo, con la muñeca recta.
De pie, pies a la anchura de la cadera, abdomen y glúteo apretados.
Empuja la pesa hacia arriba, dejando que el codo gire hacia fuera al pasar la cabeza.
Termina con el brazo estirado y la pesa sobre el hombro, no por delante.
Baja controlando al hombro. Haz todas las repeticiones y cambia.',
 'Dejar la muñeca doblada hacia atrás: duele y la pesa se va hacia fuera. Muñeca recta y puño apretado.
Arquear la lumbar para empujar.'),

(null, 'Turkish get-up', '', 'abdominales', array['deltoide_anterior','oblicuos','gluteo']::public.muscle_group[], 'kettlebell', 'compuesto', 'core', true,
 true, true, false, 2, 5, null, null, 120, false,
 'Pasar de tumbado a de pie con la pesa siempre arriba. Se hace despacio y con poco peso.',
 'Túmbate de lado con la kettlebell delante, agárrala con las dos manos y rueda hacia arriba con ella en el pecho.
Estira ese brazo hacia el techo y mira la pesa. Esa mirada no se pierde.
Dobla la rodilla del mismo lado y apoya ese pie; el otro brazo queda en el suelo a 45°.
Empuja con el pie y el codo libre para sentarte, luego apoya la mano.
Pasa la pierna estirada por debajo hasta arrodillarte, y ponte de pie.
Invierte todos los pasos para volver al suelo. Ése es una repetición.',
 'Ir rápido: es un ejercicio de control, y con prisa el hombro queda sin proteger.
Dejar de mirar la pesa: es lo que mantiene el hombro colocado.
Empezar con peso: hazlo primero con un zapato o una botella encima del puño.'),

(null, 'Halo con kettlebell', '', 'deltoide_anterior', array['espalda_alta','abdominales']::public.muscle_group[], 'kettlebell', 'aislamiento', 'empuje_vertical', false,
 true, true, false, 8, 12, null, null, 60, false,
 'Movilidad de hombro con algo de carga. Buen calentamiento antes de empujar por encima de la cabeza.',
 'Coge la kettlebell por los lados del asa, boca abajo, delante del pecho.
De pie, pies a la anchura de la cadera, abdomen apretado.
Lleva la pesa alrededor de la cabeza, pasándola por detrás del cuello y volviendo al pecho.
Haz la mitad de las repeticiones en un sentido y la mitad en el otro.',
 'Mover el torso y la cadera para que la pesa pase: sólo se mueven los brazos.
Usar mucho peso: aquí se busca el rango de hombro, no carga.'),

(null, 'Remo renegado con kettlebell', '', 'dorsal', array['abdominales','oblicuos','espalda_alta']::public.muscle_group[], 'kettlebell', 'compuesto', 'tiron_horizontal', true,
 true, true, false, 6, 12, null, null, 105, false,
 'Remo y plancha a la vez. El abdomen impide que la cadera gire al tirar.',
 'Pon dos kettlebells en el suelo a la anchura de los hombros.
Agárralas y ponte en posición de flexión con los brazos estirados, pies algo separados para tener base.
Aprieta abdomen y glúteo.
Tira de una pesa hacia la cadera llevando el codo atrás, sin que la cadera gire.
Bájala y repite con la otra. Cada lado es una repetición.',
 'Girar la cadera al tirar: resistir ese giro es la mitad del ejercicio.
Juntar los pies: sin base, la cadera gira sí o sí.
Usar pesas redondas que rueden: las kettlebells y las mancuernas hexagonales van bien, las redondas no.'),

(null, 'Peso muerto sumo con kettlebell', '', 'gluteo', array['isquiotibiales','cuadriceps','lumbares']::public.muscle_group[], 'kettlebell', 'compuesto', 'dominante_cadera', false,
 true, true, false, 8, 15, null, null, 90, false,
 'La forma más fácil de aprender a llevar la cadera atrás con peso. Buen primer peso muerto.',
 'Pon la kettlebell en el suelo entre los pies, con los pies algo más abiertos que los hombros y las puntas hacia fuera.
Lleva la cadera atrás y baja doblando las rodillas, espalda recta, hasta agarrar el asa con las dos manos.
Pecho alto y abdomen apretado.
Levántate empujando el suelo y apretando el glúteo arriba.
Baja controlando hasta apoyar la pesa.',
 'Redondear la espalda al coger la pesa.
Tirar con los brazos: los brazos sólo sujetan.'),

(null, 'Windmill con kettlebell', '', 'oblicuos', array['deltoide_anterior','isquiotibiales']::public.muscle_group[], 'kettlebell', 'compuesto', 'core', true,
 true, true, false, 5, 10, null, null, 90, false,
 'Movilidad de cadera y hombro con carga. Poco peso y mucho control.',
 'De pie con una kettlebell sujeta arriba con un brazo estirado, palma hacia delante.
Gira las puntas de los pies unos 45° hacia el lado contrario a la pesa.
Mirando la pesa, lleva la cadera hacia el lado del brazo que la sujeta e inclina el torso bajando la mano libre por la pierna.
Baja hasta tocarte el pie o el suelo, con la pierna casi recta y el brazo de arriba siempre vertical.
Vuelve arriba y haz todas las repeticiones antes de cambiar.',
 'Doblar el brazo de arriba: la pesa se te viene encima.
Dejar de mirar la pesa.
Empezar con peso: aprende el gesto sin nada.'),

-- -------------------------------------------- AGARRE Y ACCESORIOS
(null, 'Hand grip (pinza de mano)', '', 'antebrazo', array[]::public.muscle_group[], 'otro', 'aislamiento', 'aislamiento_brazo', true,
 true, true, false, 10, 20, null, null, 45, false,
 'Apunta la dureza del muelle en kilos si la trae escrita; si no, en las notas. Es agarre de cerrar, no de aguantar.',
 'Coge el hand grip con una mano, con el muelle hacia fuera y las asas cruzando la palma.
Coloca la asa de abajo en la base de los dedos, no en la mitad de la palma: ahí tienes más fuerza y más recorrido.
Cierra la mano hasta que las asas se toquen.
Abre controlando hasta el final, sin dejar que el muelle salte.
Haz todas las repeticiones y cambia de mano.',
 'Cerrar sólo a medias: el último tramo es justo el que cuesta y el que hay que entrenar.
Apoyar el grip en la palma en vez de en la base de los dedos: se cierra menos con más esfuerzo.
Hacerlo todos los días a tope: el antebrazo también necesita descansar, y con el agarre se acumula tendinitis sin avisar.'),

(null, 'Aguante con hand grip', '', 'antebrazo', array[]::public.muscle_group[], 'otro', 'aislamiento', 'aislamiento_brazo', true,
 true, false, true, 1, 1, 20, 45, 45, false,
 'Se mide en segundos: cerrado del todo y aguantando. Es la otra mitad del agarre.',
 'Coge el hand grip con las asas en la base de los dedos.
Ciérralo del todo, hasta que las asas se toquen.
Aguanta cerrado los segundos que toque, sin dejar que se abra ni un poco.
Cambia de mano.',
 'Dejar que se abra poco a poco y seguir contando: el tiempo cuenta hasta que se abre.
Aguantar la respiración.'),

(null, 'Pinza de discos', '', 'antebrazo', array[]::public.muscle_group[], 'disco', 'aislamiento', 'aislamiento_brazo', true,
 true, false, true, 1, 1, 15, 40, 60, false,
 'Se mide en segundos y en kilos: dos discos lisos juntos, sujetos sólo con los dedos.',
 'Pon dos discos lisos juntos, con las caras lisas hacia fuera, de canto en el suelo.
Agárralos por arriba con los dedos por un lado y el pulgar por el otro, como una pinza.
Levántalos y aguanta de pie con el brazo al costado los segundos que toque.
Bájalos con cuidado al suelo, no los sueltes.
Cambia de mano.',
 'Soltarlos de golpe: caen sobre el pie o el suelo.
Apoyarlos en la pierna para descansar a mitad.
Empezar con discos grandes: dos de cinco kilos ya cuestan bastante.'),

(null, 'Colgarse de la barra a una mano', '', 'antebrazo', array['dorsal','espalda_alta']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'aislamiento_brazo', true,
 true, false, true, 1, 1, 10, 30, 60, false,
 'Se mide en segundos. El paso siguiente cuando colgarse con las dos manos ya no cuesta.',
 'Agarra la barra con una mano, palma hacia delante.
Cuélgate con el brazo estirado y los pies sin tocar el suelo.
Deja el hombro activo, no del todo suelto, y aprieta un poco el abdomen para no girar.
Aguanta los segundos que toque y cambia de mano.',
 'Dejarse girar: el hombro acaba en posiciones raras. Aprieta el abdomen y el glúteo.
Hacerlo antes de aguantar un minuto con las dos manos: el hombro y el codo necesitan esa base.'),

(null, 'Colgarse con toalla', '', 'antebrazo', array['dorsal']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'aislamiento_brazo', false,
 true, false, true, 1, 1, 10, 30, 60, false,
 'Se mide en segundos. La toalla es más gruesa y resbala: el agarre trabaja mucho más que en la barra.',
 'Pasa una o dos toallas por encima de una barra fija, dejando los extremos colgando.
Agarra un extremo con cada mano, lo más arriba posible.
Cuélgate con los brazos estirados y los pies sin tocar el suelo.
Aguanta los segundos que toque.',
 'Usar una toalla fina que se deslice por la barra: enróllala bien o usa dos.
Soltar de golpe: apoya los pies antes.'),

(null, 'Rodillo de muñeca', '', 'antebrazo', array[]::public.muscle_group[], 'otro', 'aislamiento', 'aislamiento_brazo', false,
 true, true, false, 3, 6, null, null, 90, false,
 'Un palo con una cuerda y un peso colgando. Cada subida y bajada completa es una repetición.',
 'Coge el rodillo con las dos manos, brazos estirados hacia delante a la altura de los hombros.
El peso cuelga de la cuerda, tocando casi el suelo.
Gira el rodillo con las muñecas, una mano tras otra, enrollando la cuerda hasta que el peso llegue arriba.
Desenróllalo controlando hasta abajo, sin dejar que caiga.
Esa ida y vuelta es una repetición.',
 'Dejar caer el peso al desenrollar: la bajada es la mitad del trabajo y es la parte que menos se hace.
Bajar los brazos para descansar: se quedan estirados a la altura del hombro.
Poner mucho peso: dos kilos y medio ya arden.'),

(null, 'Paseo del granjero a una mano', '', 'oblicuos', array['antebrazo','espalda_alta','abdominales']::public.muscle_group[], 'mancuernas', 'compuesto', 'transporte', true,
 true, false, true, 1, 1, 20, 45, 90, false,
 'Se mide en segundos y en kilos. Con peso en un solo lado, el oblicuo del otro lado es el que trabaja.',
 'Coge una mancuerna o kettlebell pesada con una mano, doblando cadera y rodillas para cogerla del suelo.
Ponte de pie con el pecho alto, hombros atrás y el brazo libre al costado, sin agarrarte a nada.
Camina con pasos cortos, manteniendo los hombros y la cadera nivelados: el ejercicio es no inclinarse.
Camina los segundos que toque y cambia de lado.',
 'Inclinarse hacia el lado del peso: es exactamente lo que hay que resistir.
Inclinarse al lado contrario para contrapesar: el torso se queda vertical.
Apoyar el brazo libre en la pierna.'),

(null, 'Paseo con peso sobre la cabeza', '', 'deltoide_anterior', array['abdominales','espalda_alta']::public.muscle_group[], 'kettlebell', 'compuesto', 'transporte', true,
 true, false, true, 1, 1, 15, 40, 90, false,
 'Se mide en segundos y en kilos. Pide hombro estable y abdomen apretado a la vez.',
 'Lleva una kettlebell o mancuerna a la posición de arriba con un brazo estirado.
Aprieta abdomen y glúteo para que la lumbar no se arquee, con las costillas hacia abajo.
Bloquea el codo y mantén el peso justo sobre el hombro, no por delante.
Camina con pasos cortos los segundos que toque y cambia de brazo.',
 'Arquear la lumbar: es lo que pasa en cuanto el peso se va por delante del hombro.
Doblar el codo a mitad del paseo: si se dobla, la serie ha terminado.'),

(null, 'Arrastre de trineo', '', 'cuadriceps', array['gluteo','gemelos']::public.muscle_group[], 'otro', 'compuesto', 'transporte', false,
 true, false, true, 1, 1, 20, 45, 120, false,
 'Se mide en segundos y en kilos. Todo es empuje concéntrico: apenas deja agujetas y cansa mucho.',
 'Carga el trineo con discos y agarra las asas o el arnés.
Inclina el torso hacia delante, brazos estirados, abdomen apretado.
Empuja el suelo con pasos cortos y potentes, sin dejar que el torso se levante.
Sigue durante los segundos que toque.',
 'Dar pasos largos: se pierde la fuerza del empuje.
Ponerse demasiado vertical: la inclinación es lo que deja empujar.'),

(null, 'Sentadilla Zercher', '', 'cuadriceps', array['gluteo','abdominales','espalda_alta']::public.muscle_group[], 'barra', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 5, 10, null, null, 150, false,
 'La barra va en el hueco de los codos. Incomoda, y obliga a un torso vertical que ninguna otra sentadilla pide.',
 'Pon la barra en el rack a la altura de la cadera, o levántala del suelo hasta los codos.
Mete los antebrazos por debajo de la barra y apóyala en el hueco de los codos, juntando las manos delante del pecho.
Usa una toalla enrollada sobre la barra si te hace daño.
Pies a la anchura de los hombros y baja con el torso vertical hasta que la cadera pase la rodilla.
Sube empujando el suelo, sin dejar caer los codos.',
 'Cargar como en una sentadilla trasera: aquí manda lo que aguanten los codos y el abdomen, no las piernas.
Dejar caer los codos y redondear la espalda: es la señal de parar la serie.'),

(null, 'Press Landmine a una mano', '', 'deltoide_anterior', array['pecho','triceps','abdominales']::public.muscle_group[], 'barra', 'compuesto', 'empuje_vertical', true,
 true, true, false, 8, 12, null, null, 105, false,
 'Empuje en diagonal: para hombros a los que el press vertical les molesta, suele ser la salida.',
 'Mete un extremo de la barra en el soporte de landmine o en una esquina firme, y carga discos en el otro.
Ponte de frente al ancla y sube ese extremo hasta el hombro con una mano, el codo pegado al torso.
Pies a la anchura de la cadera, uno algo adelantado, abdomen apretado.
Empuja la barra hacia delante y arriba en diagonal hasta estirar el brazo.
Baja controlando al hombro. Haz todas las repeticiones y cambia.',
 'Girar el torso para empujar más: el pecho se queda de frente.
Arquear la lumbar al empujar.'),

(null, 'Remo Landmine a una mano', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'barra', 'compuesto', 'tiron_horizontal', true,
 true, true, false, 8, 12, null, null, 105, false,
 'La barra en el suelo describe un arco, así que el hombro trabaja en una línea más natural que con mancuerna.',
 'Mete un extremo de la barra en el soporte de landmine y carga discos en el otro.
Ponte de lado o a horcajadas sobre la barra, lleva la cadera atrás y agarra el extremo cargado con una mano.
Espalda recta, torso inclinado.
Tira llevando el codo hacia la cadera hasta que la mano llegue al torso.
Baja controlando hasta estirar el brazo. Cambia de lado al acabar.',
 'Girar el torso para tirar más peso.
Levantar el torso en cada repetición.');
