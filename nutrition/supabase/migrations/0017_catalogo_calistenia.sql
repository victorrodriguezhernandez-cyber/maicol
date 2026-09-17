-- Catálogo: calistenia, anillas y barra.
--
-- Todos con `tracks_weight = true` aunque sean de peso corporal: en
-- cuanto una dominada te sale fácil, la progresión es cinturón con
-- disco, y sin casilla de kilos ese dato se pierde (es el mismo fallo
-- que tenía el paseo del granjero antes de la 0008).
--
-- Los isométricos (L-sit, front lever, plancha, pica) van por SEGUNDOS y
-- no por repeticiones: "3 repeticiones de L-sit" no significa nada.
--
-- Sobre los nombres: se escriben para poder distinguirlos en una lista.
-- "Flexiones" a secas ya existe, así que cada variante dice qué cambia
-- (diamante, arquero, pseudo planche), porque en el selector se leen
-- seguidas y "flexiones 2" no le dice nada a nadie.

insert into public.exercises (
  user_id, name, name_normalized, primary_muscle, secondary_muscles,
  equipment, mechanic, pattern, is_unilateral,
  tracks_weight, tracks_reps, tracks_duration,
  default_reps_min, default_reps_max, default_duration_min, default_duration_max,
  default_rest_seconds, is_common, cues, how_to, mistakes
) values
(null, 'Dominadas lastradas', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false,
 true, true, false, 4, 8, null, null, 180, false,
 'Apunta SÓLO el peso añadido, no tu peso corporal. Así el número sube cuando de verdad progresas.',
 'Ponte un cinturón de lastre con un disco, o sujeta una mancuerna entre los pies o las rodillas.
Agarra la barra con las palmas hacia delante, algo más abiertas que los hombros.
Cuélgate estirado, baja los omóplatos y tira llevando los codos a las costillas hasta que el pecho llegue a la barra.
Baja controlando hasta quedar colgado del todo.',
 'Empezar a lastrar antes de tener 8-10 dominadas limpias: el peso extra sólo acorta el recorrido.
Sujetar la mancuerna con los pies cruzados y que se caiga a mitad de serie: usa cinturón o chaleco si pasas de 10 kg.'),

(null, 'Dominadas negativas', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false,
 true, true, false, 3, 6, null, null, 150, false,
 'Es el camino para conseguir la primera dominada. Sólo se hace la bajada, y lo más lenta posible.',
 'Sube a la posición de arriba de la dominada con un salto, un banco o un escalón, con la barbilla por encima de la barra.
Aguanta ahí un segundo con los omóplatos bajados.
Baja lo más despacio que puedas, contando entre 3 y 5 segundos, hasta quedar colgado del todo.
Vuelve a subirte con ayuda para la siguiente.',
 'Dejarse caer los últimos centímetros: la parte de abajo es justo la que hay que fortalecer.
Contarlas como dominadas normales en el historial: son un ejercicio distinto y con otro número.'),

(null, 'Dominadas con salto explosivo', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false,
 true, true, false, 3, 6, null, null, 150, false,
 'Se tira todo lo fuerte posible para que las manos se despeguen arriba. Es potencia, no volumen.',
 'Cuélgate de la barra con las palmas hacia delante y los brazos estirados.
Tira con toda la fuerza y velocidad que puedas, intentando que el pecho pase la barra.
Arriba, suelta un instante y vuelve a agarrar.
Baja controlando y para: no encadenes con inercia.',
 'Hacerlas cansado al final del entreno: la potencia se entrena fresco, si no es sólo un balanceo.
Aterrizar con los brazos estirados de golpe: amortigua doblando un poco los codos.'),

(null, 'Muscle-up en barra', '', 'dorsal', array['triceps','deltoide_anterior','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false,
 true, true, false, 2, 5, null, null, 180, false,
 'Es una dominada explosiva más un fondo, pegados. Antes de intentarlo: 10 dominadas y 10 fondos limpios.',
 'Agarra la barra con las palmas hacia delante y cuélgate estirado.
Tira explosivo llevando el pecho a la barra, con los codos hacia atrás.
Cuando el pecho esté a la altura de la barra, mete las muñecas y pasa los codos por encima girándolos hacia delante.
Termina empujando como en un fondo hasta estirar los brazos con el cuerpo por encima de la barra.
Baja controlando invirtiendo el movimiento.',
 'Intentarlo con balanceo (kipping) desde el principio: engancha el hombro en la transición, que es la parte más vulnerable.
Empezar sin tener la fuerza base: practica primero dominadas explosivas y la transición con goma.'),

(null, 'Dominadas arqueras', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', true,
 true, true, false, 3, 6, null, null, 150, false,
 'Paso intermedio hacia la dominada a una mano: un brazo tira y el otro sólo acompaña estirado.',
 'Agarra la barra bastante más ancho que los hombros, palmas hacia delante.
Cuélgate estirado y tira hacia UN lado, llevando el pecho hacia esa mano.
El brazo del otro lado se queda casi estirado, sólo guiando.
Baja controlando y repite hacia el otro lado.',
 'Doblar los dos brazos por igual: entonces es una dominada ancha normal.
Girar el torso para llegar: el pecho va hacia la mano, el cuerpo se queda de frente.'),

(null, 'Dominadas en anillas', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_vertical', false,
 true, true, false, 5, 10, null, null, 150, false,
 'Las anillas giran, así que el hombro y el codo eligen su ángulo. Suele molestar menos que la barra.',
 'Cuelga las anillas a la altura a la que puedas quedar suspendido con los brazos estirados.
Agárralas con las palmas hacia ti o enfrentadas.
Cuélgate estirado, baja los omóplatos y tira llevando los codos a las costillas.
Deja que las anillas giren solas según suba el cuerpo.
Baja controlando hasta estirar.',
 'Apretar las anillas en una posición fija: la gracia es dejarlas girar.
Balancearse: las anillas se mueven, así que hay que apretar más el abdomen que en la barra.'),

(null, 'Remo en anillas', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'peso_corporal', 'compuesto', 'tiron_horizontal', false,
 true, true, false, 8, 15, null, null, 105, false,
 'La dificultad se regula con la altura de las anillas y con lo horizontal que te pongas.',
 'Cuelga las anillas a la altura de la cadera y agárralas con las palmas enfrentadas.
Túmbate debajo con el cuerpo estirado y los talones apoyados.
Aprieta abdomen y glúteo para mantener la línea recta.
Tira llevando los codos hacia atrás hasta que las manos lleguen al torso.
Baja controlando hasta estirar los brazos.',
 'Dejar caer la cadera: la línea se rompe y el recorrido se acorta.
Bajar las anillas para hacerlo más difícil y perder la línea: si no puedes mantener el cuerpo recto, súbelas.'),

(null, 'Fondos en anillas', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 5, 10, null, null, 150, false,
 'Muchísimo más duro que en paralelas: además de empujar, hay que impedir que las anillas se abran.',
 'Cuelga las anillas a la altura de la cadera, separadas a la anchura de los hombros.
Súbete con los brazos estirados y las anillas pegadas al costado, giradas hacia fuera.
Aprieta abdomen y glúteo, piernas juntas o cruzadas.
Baja controlando hasta que los hombros queden a la altura de los codos.
Empuja hasta estirar los brazos y volver a girar las anillas hacia fuera.',
 'Dejar que las anillas se separen: el hombro aguanta la apertura y es donde se lesiona.
Intentarlo sin tener fondos en paralelas limpios.'),

(null, 'Flexiones en anillas', '', 'pecho', array['triceps','abdominales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 8, 15, null, null, 120, false,
 'Las anillas cerca del suelo convierten la flexión en un ejercicio de estabilidad además de fuerza.',
 'Baja las anillas hasta unos centímetros del suelo.
Agárralas y ponte en posición de flexión con los pies apoyados y el cuerpo recto.
Baja doblando los codos hacia atrás hasta notar estiramiento en el pecho.
Empuja hasta estirar los brazos, sin dejar que las anillas se abran.',
 'Dejar que las manos se separen sin control: el hombro se abre y no hay nada que lo sujete.
Subir la cadera para que sea más fácil.'),

(null, 'Flexiones diamante', '', 'triceps', array['pecho','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 8, 15, null, null, 105, false,
 'Manos juntas formando un triángulo bajo el esternón. Es la flexión de tríceps.',
 'Pon las manos en el suelo juntas, con los índices y los pulgares tocándose y formando un rombo.
Coloca ese rombo justo debajo del esternón.
Estira el cuerpo en línea recta, abdomen y glúteo apretados.
Baja doblando los codos hacia atrás y pegados al torso, hasta que el pecho toque las manos.
Empuja hasta estirar los brazos.',
 'Abrir los codos hacia los lados: pierde el tríceps y carga el hombro.
Poner las manos a la altura de la cara: la muñeca se dobla mucho y el recorrido cambia.
Si te molestan las muñecas, prueba con los puños o con las manos más separadas.'),

(null, 'Flexiones arqueras', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', true,
 true, true, false, 5, 10, null, null, 120, false,
 'Camino hacia la flexión a una mano: un brazo empuja, el otro se queda estirado.',
 'Pon las manos en el suelo bastante más abiertas que los hombros.
Estira el cuerpo en línea recta.
Baja hacia UN lado doblando ese codo, dejando el otro brazo casi estirado.
El pecho baja al lado de la mano que trabaja.
Empuja con ese brazo para volver y repite al otro lado.',
 'Doblar los dos brazos: es una flexión ancha normal.
Girar la cadera para bajar más: el cuerpo se queda de frente al suelo.'),

(null, 'Flexiones pseudo planche', '', 'pecho', array['deltoide_anterior','triceps','abdominales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 5, 10, null, null, 120, false,
 'Manos a la altura de la cadera y hombros por delante de ellas. Carga muchísimo el deltoides anterior.',
 'Pon las manos en el suelo a la altura de la cintura, con los dedos apuntando hacia atrás o a los lados.
Estira el cuerpo y echa los hombros hacia delante, por delante de las manos.
Aprieta glúteo y abdomen y mete un poco la pelvis.
Baja manteniendo los hombros adelantados y los codos pegados al torso.
Empuja hasta estirar, sin dejar que los hombros vuelvan detrás de las manos.',
 'Dejar que los hombros vuelvan sobre las manos: entonces es una flexión normal.
Arquear la lumbar: es el fallo que hace que parezca que avanzas cuando no.
Empezar con las manos muy atrás: acerca la posición poco a poco a lo largo de semanas.'),

(null, 'Flexiones en pica', '', 'deltoide_anterior', array['triceps','deltoide_lateral']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_vertical', false,
 true, true, false, 6, 12, null, null, 120, false,
 'Es el press de hombro de la calistenia. Cuanto más vertical, más peso llevas.',
 'Ponte en posición de flexión y camina con los pies hacia las manos hasta que la cadera quede arriba y el cuerpo forme una V.
Manos a la anchura de los hombros, mirada al suelo entre las manos.
Baja doblando los codos hasta que la cabeza casi toque el suelo, por delante de las manos.
Empuja hasta estirar los brazos.',
 'Bajar la cabeza entre las manos en vez de por delante: el recorrido se acorta y el hombro trabaja cerrado.
Dejar caer la cadera: se convierte en una flexión normal.
Para hacerlo más difícil, sube los pies a un banco; eso acerca la posición a la vertical.'),

(null, 'Flexiones en vertical contra pared', '', 'deltoide_anterior', array['triceps','deltoide_lateral']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_vertical', false,
 true, true, false, 3, 8, null, null, 180, false,
 'El press de hombro con todo tu peso. Antes: aguantar la vertical contra la pared un minuto.',
 'Ponte de espaldas a la pared, manos en el suelo a un palmo de ella, y sube los pies a la pared hasta quedar boca abajo en vertical.
Manos algo más abiertas que los hombros, dedos hacia delante.
Aprieta abdomen y glúteo para no arquear la lumbar.
Baja doblando los codos hasta que la cabeza toque el suelo, formando un triángulo con las manos.
Empuja hasta estirar los brazos.',
 'Intentarlo sin controlar la vertical: si no aguantas quieto, no puedes controlar la bajada.
Arquear la lumbar para compensar la falta de fuerza.
Bajar hasta la cabeza de golpe: pon una almohadilla y baja controlando.'),

(null, 'Pica contra pared (aguante)', '', 'deltoide_anterior', array['abdominales','triceps']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'empuje_vertical', false,
 true, false, true, 1, 1, 20, 45, 90, false,
 'Es el paso previo a cualquier cosa en vertical: aguantar la posición quieto.',
 'Ponte de espaldas a la pared y apoya las manos en el suelo a un palmo de ella.
Sube los pies andando por la pared hasta quedar boca abajo, cuerpo estirado.
Aprieta abdomen y glúteo y mete la pelvis, para que la espalda no se arquee.
Mira al suelo entre las manos y aguanta los segundos que toque, respirando.',
 'Arquear la lumbar y dejar la barriga hacia la pared: es la postura que se ve siempre y la que no enseña a controlar nada.
Aguantar la respiración.'),

(null, 'L-sit', '', 'abdominales', array['triceps','cuadriceps']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', false,
 true, false, true, 1, 1, 10, 30, 90, false,
 'Se mide en segundos. Las piernas rectas y paralelas al suelo es la posición completa.',
 'Siéntate en el suelo con las manos a los lados de la cadera, o cuélgate de dos paralelas bajas.
Empuja el suelo con las manos hasta despegar el culo, con los brazos estirados y los hombros hacia abajo.
Estira las piernas hacia delante y súbelas hasta que queden paralelas al suelo.
Aguanta los segundos que toque.',
 'Encoger los hombros hacia las orejas: cansa el cuello y el abdomen trabaja menos.
Redondear la espalda: la posición es con el pecho alto.
Si no llegas con las piernas rectas, empieza con las rodillas dobladas (tuck). Es la progresión, no una versión mala.'),

(null, 'Front lever en tuck', '', 'dorsal', array['abdominales','espalda_alta']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false,
 true, false, true, 1, 1, 8, 20, 120, false,
 'Se mide en segundos. Cuanto más estiradas las piernas, más difícil: ésa es la progresión.',
 'Cuélgate de una barra con las palmas hacia delante y los brazos estirados.
Baja los omóplatos y tira un poco de la barra hacia abajo, con los brazos rectos.
Sube las rodillas al pecho y échate hacia atrás hasta quedar horizontal, de espaldas al suelo.
Aprieta abdomen y glúteo y aguanta los segundos que toque.',
 'Doblar los codos: se convierte en otra cosa y la espalda deja de trabajar como debe.
Dejar la cadera baja: el cuerpo tiene que quedar horizontal, no colgando en diagonal.
Aguantar la respiración.'),

(null, 'Dragon flag', '', 'abdominales', array['oblicuos','lumbares']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false,
 true, true, false, 3, 8, null, null, 120, false,
 'De los ejercicios de abdomen más duros que hay. La lumbar no se separa nunca del banco.',
 'Túmbate en un banco y agárrate con las manos por detrás de la cabeza a un soporte firme.
Sube las piernas y la cadera hasta quedar casi vertical, apoyado sólo en los omóplatos.
Baja el cuerpo ENTERO recto y despacio, sin doblar la cadera, hasta que quede a un palmo del banco.
Sube otra vez apretando el abdomen.',
 'Doblar la cadera al bajar: es lo que lo hace fácil, y entonces no es un dragon flag.
Despegar la lumbar del banco: es la señal de parar la serie.
Empezar con las piernas rectas: dobla las rodillas al principio y ve estirándolas con las semanas.'),

(null, 'Sentadilla a una pierna (pistol)', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_rodilla', true,
 true, true, false, 3, 8, null, null, 120, false,
 'Pide fuerza, equilibrio y movilidad de tobillo a la vez. Se empieza asistido y no pasa nada.',
 'De pie sobre una pierna, con la otra estirada hacia delante y sin tocar el suelo.
Brazos hacia delante para equilibrar.
Baja doblando la rodilla de apoyo, con el talón siempre en el suelo, hasta abajo del todo.
Sube empujando el suelo con todo el pie.
Haz todas las repeticiones y cambia.',
 'Levantar el talón para bajar más: casi siempre es falta de movilidad de tobillo. Pon un disco fino bajo el talón mientras la ganas.
Dejarse caer al fondo y rebotar: la rodilla aguanta el golpe.
Si no llegas, sujétate a algo o siéntate en un banco y ve bajando la altura.'),

(null, 'Sentadilla a una pierna al cajón', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_rodilla', true,
 true, true, false, 5, 10, null, null, 105, false,
 'La progresión para llegar al pistol: bajas hasta un cajón y vas quitándole altura.',
 'Ponte de espaldas a un cajón o banco, de pie sobre una pierna, con la otra estirada delante.
Baja doblando la rodilla de apoyo hasta sentarte suavemente en el cajón.
Sube empujando con esa pierna, sin dar impulso con la otra.
Cuando salgan 10 limpias, baja la altura del cajón.',
 'Dejarse caer en el cajón: se toca, no se descansa.
Empujar con la pierna libre apoyándola en el suelo.'),

(null, 'Fondos en banco con pies elevados', '', 'triceps', array['deltoide_anterior','pecho']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 8, 15, null, null, 105, false,
 'La versión difícil del fondo entre bancos: con los pies arriba llevas más peso en los brazos.',
 'Siéntate en el borde de un banco y apoya las manos a los lados de la cadera.
Pon los talones en otro banco delante, piernas estiradas.
Adelanta el culo hasta quedar suspendido, pegado al banco.
Baja doblando los codos hacia atrás hasta 90°.
Empuja hasta estirar los brazos.',
 'Alejar el culo del banco: el hombro se abre hacia atrás y es donde se pinza.
Bajar más de 90°.'),

(null, 'Escalador', '', 'abdominales', array['oblicuos','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false,
 true, false, true, 1, 1, 20, 45, 60, false,
 'Se cuenta en segundos. Vale para core y para subir pulsaciones sin material.',
 'Ponte en posición de flexión con los brazos estirados y el cuerpo recto.
Aprieta el abdomen para que la cadera no suba ni baje.
Lleva una rodilla hacia el pecho y vuelve a apoyar el pie.
Alterna piernas con ritmo, sin que la cadera se mueva arriba y abajo.
Sigue durante los segundos que toque.',
 'Subir el culo cada vez que entra la rodilla: el abdomen deja de sostener.
Apoyar el pie tan atrás que se pierda la línea del cuerpo.'),

(null, 'Burpee', '', 'cuadriceps', array['pecho','deltoide_anterior','abdominales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 8, 15, null, null, 90, false,
 'Cuerpo entero y pulsaciones. Se cuenta en repeticiones porque cada ciclo es una.',
 'De pie, baja las manos al suelo doblando cadera y rodillas.
Lanza los pies hacia atrás hasta quedar en posición de flexión.
Haz una flexión completa, con el pecho al suelo.
Trae los pies de un salto hacia las manos.
Levántate y salta con los brazos arriba. Ése es una repetición.',
 'Dejar caer la cadera en la flexión: con las prisas es lo primero que se pierde.
Hacer 50 seguidas mal: es mejor contar menos y que cada una tenga flexión completa.'),

(null, 'Salto al cajón', '', 'cuadriceps', array['gluteo','gemelos']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 3, 6, null, null, 150, false,
 'Es potencia: pocas repeticiones y descansado. Si te cansas, deja de ser un salto.',
 'Ponte a un paso de un cajón firme que te llegue por debajo de la rodilla.
Baja un poco doblando cadera y rodillas y echa los brazos atrás.
Salta hacia arriba y adelante y aterriza con los dos pies enteros sobre el cajón, absorbiendo con rodillas y cadera.
Ponte de pie arriba y BAJA andando, no saltando.',
 'Bajar de un salto: el impacto al caer es mucho mayor que al subir y no aporta nada.
Elegir un cajón demasiado alto: se llega recogiendo mucho las rodillas, no saltando más. Es la forma de tropezar.
Hacer series de 20: pasado el quinto salto ya no hay potencia, sólo fatiga.');
