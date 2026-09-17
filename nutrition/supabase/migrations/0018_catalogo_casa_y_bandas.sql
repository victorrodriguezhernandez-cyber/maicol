-- Catálogo: en casa sin material, y con banda elástica.
--
-- Las bandas llevan `tracks_weight = false`. No tienen kilos, y pedir un
-- número que no existe obliga a inventárselo: es exactamente el fallo que
-- arregló la 0008 al revés. Lo que se apunta de una banda son las
-- repeticiones; la resistencia la lleva el color, y eso va en las notas.
--
-- Los de casa están pensados para que alguien sin nada en el salón pueda
-- entrenar de verdad, con su progresión escrita: cuándo pasar a la
-- siguiente versión en vez de hacer 60 repeticiones de la misma.

insert into public.exercises (
  user_id, name, name_normalized, primary_muscle, secondary_muscles,
  equipment, mechanic, pattern, is_unilateral,
  tracks_weight, tracks_reps, tracks_duration,
  default_reps_min, default_reps_max, default_duration_min, default_duration_max,
  default_rest_seconds, is_common, cues, how_to, mistakes
) values
-- ---------------------------------------------- CASA, SIN NADA
(null, 'Flexiones con rodillas apoyadas', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 8, 20, null, null, 75, false,
 'La primera versión de la flexión. Cuando salgan 15-20 limpias, pasa a las inclinadas.',
 'Apoya las rodillas y las manos en el suelo, manos algo más abiertas que los hombros.
Desde las rodillas a la cabeza el cuerpo es una línea recta: la cadera no se queda atrás.
Aprieta abdomen y glúteo.
Baja hasta que el pecho quede a un puño del suelo.
Empuja hasta estirar los brazos.',
 'Sentarse sobre los talones con la cadera doblada: es la postura cómoda y quita casi todo el trabajo.
Quedarse aquí para siempre: son un escalón, no el destino.'),

(null, 'Flexiones con manos elevadas', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'empuje_horizontal', false,
 true, true, false, 8, 15, null, null, 90, false,
 'Manos en una silla o un escalón. Cuanto más alto el apoyo, más fácil: es la progresión hacia el suelo.',
 'Apoya las manos en el borde de una silla firme, una mesa baja o un escalón.
Estira las piernas y apoya las puntas de los pies, cuerpo en línea recta.
Baja hasta que el pecho toque el apoyo.
Empuja hasta estirar los brazos.
Cuando salgan 15, busca un apoyo más bajo.',
 'Usar una silla con ruedas o que se mueva.
Subir la cadera al empujar.'),

(null, 'Sentadilla al aire', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_rodilla', false,
 true, true, false, 12, 25, null, null, 75, true,
 'La base de todo el tren inferior sin material. Baja del todo o no cuenta.',
 'De pie, pies a la anchura de los hombros y puntas ligeramente hacia fuera.
Extiende los brazos hacia delante para equilibrar.
Baja llevando la cadera atrás y las rodillas afuera, con el pecho alto.
Baja hasta que la cadera pase por debajo de la rodilla.
Sube empujando el suelo con todo el pie.',
 'Quedarse en un cuarto de sentadilla: sin peso encima no hay excusa para no bajar del todo.
Levantar los talones: si te pasa, es movilidad de tobillo; pon un libro fino bajo los talones mientras la trabajas.
Hacer 50 en vez de pasar a una versión más difícil (búlgara, a una pierna): repetir sin resistencia no hace crecer.'),

(null, 'Zancada estática', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_rodilla', true,
 true, true, false, 8, 15, null, null, 75, false,
 'Los pies no se mueven en toda la serie: es la versión más fácil de controlar de la zancada.',
 'Da un paso largo hacia delante y quédate ahí: un pie delante, el otro detrás con el talón levantado.
Baja recto doblando las dos rodillas hasta que la de atrás casi toque el suelo.
Sube empujando con el pie de delante, sin mover los pies de sitio.
Haz todas las repeticiones y cambia de pierna.',
 'Dar un paso corto: la rodilla de delante se adelanta demasiado.
Inclinarse hacia delante en cada repetición: el torso se queda vertical.'),

(null, 'Puente de glúteo a una pierna', '', 'gluteo', array['isquiotibiales','abdominales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'dominante_cadera', true,
 true, true, false, 8, 15, null, null, 75, false,
 'El paso siguiente al puente normal cuando ya salen 20 fáciles y no tienes peso en casa.',
 'Túmbate boca arriba con una rodilla doblada y el pie apoyado cerca del culo.
Estira la otra pierna hacia arriba o mantén la rodilla recogida al pecho.
Aprieta el abdomen y sube la cadera empujando con el talón apoyado.
Sube hasta que el cuerpo quede en línea de hombro a rodilla, sin que la cadera se ladee.
Baja controlando y haz todas las repeticiones antes de cambiar.',
 'Dejar que la cadera se ladee hacia el lado de la pierna libre: es la señal de que el glúteo de apoyo no llega todavía.
Arquear la lumbar para subir más.'),

(null, 'Elevación de talones en escalón', '', 'gemelos', array[]::public.muscle_group[], 'peso_corporal', 'aislamiento', 'aislamiento_pierna', false,
 true, true, false, 12, 20, null, null, 60, false,
 'En casa, un escalón y la pared son todo lo que hace falta para trabajar el gemelo en rango completo.',
 'Ponte de pie en el borde de un escalón con las puntas de los pies apoyadas y los talones al aire.
Sujétate a la pared o a la barandilla para equilibrarte.
Baja los talones hasta notar estiramiento en el gemelo.
Sube hasta lo más alto que llegues y aguanta un segundo.
Baja controlando.',
 'Rebotar: el tendón del gemelo es muy elástico y hace el trabajo por ti.
Hacer un recorrido corto: el rango es de estiramiento máximo a punta máxima.'),

(null, 'Plancha con toque de hombro', '', 'abdominales', array['oblicuos','deltoide_anterior']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false,
 true, false, true, 1, 1, 20, 45, 60, false,
 'La plancha se hace más difícil quitando apoyos, no alargando el tiempo.',
 'Ponte en posición de flexión con los brazos estirados y el cuerpo recto.
Separa un poco los pies: da más base.
Aprieta abdomen y glúteo y despega una mano para tocarte el hombro contrario.
Vuelve a apoyarla y cambia de mano, sin que la cadera gire ni suba.
Sigue durante los segundos que toque.',
 'Girar la cadera al levantar la mano: precisamente resistir ese giro es el ejercicio.
Ir rápido: cuanto más despacio, más hay que sostener.'),

(null, 'Bird dog', '', 'lumbares', array['abdominales','gluteo']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', true,
 true, false, true, 1, 1, 20, 40, 45, false,
 'Poco espectacular y de los mejores para la espalda: enseña a mover el brazo y la pierna sin mover la columna.',
 'Ponte a cuatro patas, manos bajo los hombros y rodillas bajo la cadera.
Aprieta el abdomen hasta que la espalda quede plana, como una mesa.
Estira a la vez el brazo derecho hacia delante y la pierna izquierda hacia atrás.
Aguanta dos segundos sin que la espalda se arquee ni la cadera se ladee, y cambia de lado.
Alterna durante los segundos que toque.',
 'Subir la pierna por encima de la línea de la espalda: el rango extra sale de arquear la lumbar.
Ladear la cadera: si pasa, sube menos la pierna.'),

(null, 'Dead bug', '', 'abdominales', array['oblicuos']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false,
 true, false, true, 1, 1, 20, 40, 45, false,
 'Todo consiste en que la lumbar no se despegue del suelo. Si se despega, la serie ha terminado.',
 'Túmbate boca arriba, brazos estirados hacia el techo y rodillas dobladas a 90° en el aire.
Aprieta la lumbar contra el suelo metiendo un poco la pelvis.
Baja a la vez el brazo derecho por encima de la cabeza y estira la pierna izquierda hacia el suelo.
Llega hasta donde puedas SIN que la lumbar se despegue, vuelve y cambia de lado.
Alterna durante los segundos que toque.',
 'Bajar brazo y pierna hasta el suelo perdiendo la presión de la lumbar: es lo que lo hace inútil.
Aguantar la respiración.'),

(null, 'Crunch bicicleta', '', 'oblicuos', array['abdominales']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false,
 true, true, false, 12, 25, null, null, 60, false,
 'Cada vez que el codo y la rodilla contraria se acercan, es media repetición.',
 'Túmbate boca arriba con las manos en las sienes, sin tirar del cuello.
Despega los omóplatos del suelo y sube las piernas con las rodillas dobladas.
Lleva el codo derecho hacia la rodilla izquierda mientras estiras la pierna derecha.
Cambia de lado sin volver a apoyar los omóplatos.
Ve alternando con control.',
 'Tirar de la cabeza con las manos: el cuello acaba dolorido y el abdomen trabaja menos.
Ir a toda velocidad moviendo sólo los codos: el giro lo hace el torso.'),

(null, 'Elevación de piernas tumbado', '', 'abdominales', array['oblicuos']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', false,
 true, true, false, 10, 20, null, null, 60, false,
 'Versión de suelo de la elevación colgado, para cuando no hay barra en casa.',
 'Túmbate boca arriba con las manos bajo el culo o a los lados.
Aprieta la lumbar contra el suelo.
Sube las piernas estiradas hasta la vertical, enrollando un poco la pelvis al final.
Baja controlando hasta donde la lumbar siga pegada al suelo, sin llegar a apoyar los pies.',
 'Bajar hasta el suelo dejando que la lumbar se arquee: ahí la espalda aguanta el peso de las piernas.
Si no controlas, dobla las rodillas: ése es tu rango de momento.'),

(null, 'V-up', '', 'abdominales', array['oblicuos','cuadriceps']::public.muscle_group[], 'peso_corporal', 'compuesto', 'core', false,
 true, true, false, 8, 15, null, null, 75, false,
 'Sube el torso y las piernas a la vez hasta tocarte los pies. Es un crunch completo y duro.',
 'Túmbate boca arriba con los brazos estirados por encima de la cabeza y las piernas rectas.
Aprieta el abdomen.
Sube a la vez el torso y las piernas estiradas hasta que las manos toquen los pies, formando una V.
Baja controlando hasta casi apoyar, sin descansar entre repeticiones.',
 'Dar un impulso con los brazos para subir: la repetición la hace la inercia.
Doblar las rodillas: si te hace falta, haz la versión de rodillas dobladas a propósito y cuéntala aparte.'),

(null, 'Tijeras', '', 'abdominales', array['cuadriceps']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'core', false,
 true, false, true, 1, 1, 20, 45, 45, false,
 'Se mide en segundos. La lumbar pegada al suelo es lo que decide cuánto puedes bajar las piernas.',
 'Túmbate boca arriba con las manos bajo el culo y las piernas estiradas y levantadas un palmo del suelo.
Aprieta la lumbar contra el suelo.
Sube una pierna y baja la otra, alternando sin que ninguna toque el suelo.
Sigue durante los segundos que toque.',
 'Bajar las piernas hasta que la lumbar se arquea: sube la altura de las dos piernas hasta que puedas mantenerla.
Aguantar la respiración.'),

(null, 'Sentadilla isométrica en pared', '', 'cuadriceps', array['gluteo']::public.muscle_group[], 'peso_corporal', 'aislamiento', 'dominante_rodilla', false,
 true, false, true, 1, 1, 30, 60, 75, false,
 'Se mide en segundos. Sin material y sin impacto: aguantar la posición es todo el ejercicio.',
 'Apoya la espalda en una pared y camina con los pies hacia delante.
Baja deslizándote hasta que las rodillas queden a 90° y los muslos paralelos al suelo.
Los pies quedan debajo de las rodillas, a la anchura de la cadera.
Aprieta la espalda contra la pared y aguanta los segundos que toque.',
 'Quedarse por encima de los 90°: es donde no cuesta nada.
Apoyar las manos en los muslos para descargar.'),

-- ---------------------------------------------------- BANDA ELÁSTICA
(null, 'Press de pecho con banda', '', 'pecho', array['triceps','deltoide_anterior']::public.muscle_group[], 'banda', 'compuesto', 'empuje_horizontal', false,
 false, true, false, 12, 20, null, null, 75, false,
 'La banda aprieta más al final del recorrido, justo donde el pecho se contrae. Apunta el color en las notas.',
 'Pasa la banda por detrás de la espalda, a la altura de los omóplatos, y coge un extremo en cada mano.
Da un paso adelante con un pie para tener base.
Manos a la altura del pecho, codos a 45° del torso.
Empuja hacia delante hasta juntar las manos, con los brazos estirados.
Vuelve controlando hasta que las manos queden al lado del pecho.',
 'Dejar que la banda te lleve los brazos atrás de golpe: la vuelta es la mitad del trabajo.
Pasar la banda por el cuello en vez de por los omóplatos.'),

(null, 'Remo con banda sentado', '', 'dorsal', array['espalda_alta','biceps']::public.muscle_group[], 'banda', 'compuesto', 'tiron_horizontal', false,
 false, true, false, 12, 20, null, null, 75, false,
 'La espalda en casa sin nada colgado: la banda pasa por los pies o por una pata firme.',
 'Siéntate en el suelo con las piernas estiradas y pasa la banda por las plantas de los pies.
Coge un extremo en cada mano, brazos estirados, espalda recta y pecho alto.
Tira llevando los codos hacia atrás y pegados al torso, hasta que las manos lleguen al abdomen.
Vuelve controlando hasta estirar los brazos.',
 'Echar el torso atrás para tirar más: el movimiento lo hacen los brazos y la espalda alta, no la cadera.
Redondear la espalda.'),

(null, 'Jalón con banda', '', 'dorsal', array['biceps','espalda_alta']::public.muscle_group[], 'banda', 'compuesto', 'tiron_vertical', false,
 false, true, false, 12, 20, null, null, 75, false,
 'Es el jalón al pecho en casa: la banda anclada arriba, en una puerta o una barra.',
 'Ancla la banda por encima de tu cabeza, en el marco de una puerta o una barra fija.
Arrodíllate debajo y coge un extremo en cada mano, brazos estirados arriba.
Tira llevando los codos hacia las costillas hasta que las manos lleguen a los hombros.
Vuelve controlando hasta estirar los brazos.',
 'Echar el torso hacia atrás: se convierte en un remo.
Anclar la banda en algo que se pueda soltar: comprueba el anclaje antes de tirar.'),

(null, 'Pull-apart con banda', '', 'deltoide_posterior', array['espalda_alta']::public.muscle_group[], 'banda', 'aislamiento', 'aislamiento_hombro', false,
 false, true, false, 15, 25, null, null, 45, false,
 'Poco glamuroso y de los mejores para el hombro. Aguanta series largas y casi a diario.',
 'Coge la banda con las dos manos, brazos estirados hacia delante a la altura del pecho, a la anchura de los hombros.
Sin doblar los codos, separa las manos hacia los lados hasta que la banda toque el pecho.
Termina con los omóplatos juntos.
Vuelve controlando hasta que los brazos queden otra vez al frente.',
 'Doblar los codos: se convierte en un remo y el deltoides posterior sale.
Encoger los hombros: el trapecio superior se lo lleva.
Usar una banda tan dura que haya que dar un tirón: aquí manda el control.'),

(null, 'Face pull con banda', '', 'deltoide_posterior', array['espalda_alta']::public.muscle_group[], 'banda', 'aislamiento', 'aislamiento_hombro', false,
 false, true, false, 12, 20, null, null, 60, false,
 'La versión de casa del face pull. Los codos van altos, por encima de la línea de los hombros.',
 'Ancla la banda a la altura de la cara, en una puerta o una barra.
Coge un extremo en cada mano y da un paso atrás hasta tener tensión, brazos estirados al frente.
Tira separando las manos hacia las orejas, con los codos altos.
Termina con las manos a los lados de la cabeza y los omóplatos juntos.
Vuelve controlando.',
 'Tirar con los codos bajos: se convierte en un remo.
Echar el torso atrás.'),

(null, 'Curl de bíceps con banda', '', 'biceps', array['antebrazo']::public.muscle_group[], 'banda', 'aislamiento', 'aislamiento_brazo', false,
 false, true, false, 12, 20, null, null, 60, false,
 'La banda aprieta más arriba, donde el curl con mancuerna es más fácil. Se complementan bien.',
 'Pisa el centro de la banda con los dos pies y coge un extremo en cada mano, palmas hacia arriba.
Brazos estirados a los lados, codos pegados al torso.
Sube flexionando los codos hasta el pecho.
Baja controlando hasta estirar, sin dejar que la banda te tire del brazo.',
 'Separar los codos del torso al subir.
Pisar la banda de lado y que se salga a mitad de serie.'),

(null, 'Extensión de tríceps con banda', '', 'triceps', array[]::public.muscle_group[], 'banda', 'aislamiento', 'aislamiento_brazo', false,
 false, true, false, 12, 20, null, null, 60, false,
 'Los codos pegados al cuerpo son el eje: si se mueven, el tríceps deja de trabajar.',
 'Ancla la banda por encima de la cabeza y coge un extremo en cada mano, o pásala por detrás de la espalda.
Codos pegados al torso, antebrazos hacia arriba.
Estira los brazos hacia abajo hasta que queden rectos y aprieta un segundo.
Vuelve controlando hasta que el antebrazo pase la horizontal.',
 'Separar los codos del torso.
Inclinarse hacia delante para poder estirar los brazos con una banda demasiado dura.'),

(null, 'Elevaciones laterales con banda', '', 'deltoide_lateral', array[]::public.muscle_group[], 'banda', 'aislamiento', 'aislamiento_hombro', false,
 false, true, false, 15, 25, null, null, 60, false,
 'Con banda hay tensión también arriba, que es donde la mancuerna deja de pesar.',
 'Pisa el centro de la banda con un pie o con los dos y coge los extremos con las manos a los lados.
Codos algo flexionados, torso ligeramente inclinado hacia delante.
Sube los brazos hacia los lados, liderando con el codo, hasta la altura de los hombros.
Baja controlando.',
 'Subir por encima del hombro: el trapecio entra.
Encoger los hombros.'),

(null, 'Caminata lateral con banda', '', 'gluteo', array['aductores']::public.muscle_group[], 'banda', 'aislamiento', 'aislamiento_pierna', false,
 false, true, false, 12, 20, null, null, 60, false,
 'Trabaja el glúteo medio, que es el que casi nadie entrena y el que estabiliza la cadera al andar.',
 'Pon una banda circular por encima de las rodillas o alrededor de los tobillos.
De pie, pies a la anchura de la cadera, rodillas algo flexionadas y torso ligeramente inclinado.
Da un paso lateral con un pie y luego acerca el otro, sin juntarlos del todo.
Cuenta cada par de pasos como una repetición y haz la mitad hacia cada lado.',
 'Dejar que las rodillas se metan hacia dentro: es justo lo que el ejercicio debe corregir.
Balancear el torso a los lados: el movimiento es de las piernas.'),

(null, 'Rotación externa de hombro con banda', '', 'deltoide_posterior', array[]::public.muscle_group[], 'banda', 'aislamiento', 'aislamiento_hombro', true,
 false, true, false, 12, 20, null, null, 45, false,
 'Para el manguito rotador. No es un ejercicio de fuerza: es de salud del hombro y va con poca resistencia.',
 'Ancla la banda a la altura del codo y ponte de lado a ella.
Coge el extremo con la mano más lejana y pega el codo al costado, doblado a 90°.
Pon una toalla enrollada entre el codo y el cuerpo si te cuesta mantenerlo pegado.
Gira el antebrazo hacia fuera, abriendo, sin mover el codo.
Vuelve controlando y haz todas las repeticiones antes de cambiar.',
 'Separar el codo del costado: el hombro gira y el manguito deja de trabajar.
Usar una banda dura: aquí sobra resistencia siempre; se busca control, no carga.'),

(null, 'Buenos días con banda', '', 'isquiotibiales', array['gluteo','lumbares']::public.muscle_group[], 'banda', 'compuesto', 'dominante_cadera', false,
 false, true, false, 12, 20, null, null, 75, false,
 'Enseña el gesto de llevar la cadera atrás sin nada de peso en la espalda. Buen calentamiento.',
 'Pisa el centro de la banda con los dos pies y pasa el otro extremo por detrás del cuello y los hombros.
De pie, rodillas con flexión mínima, espalda recta.
Lleva la cadera hacia atrás inclinando el torso hacia delante, hasta notar estiramiento detrás del muslo.
Vuelve empujando la cadera hacia delante y apretando el glúteo.',
 'Doblar las rodillas para bajar más: el isquio deja de estirarse.
Redondear la espalda al final.'),

(null, 'Sentadilla con banda', '', 'cuadriceps', array['gluteo','isquiotibiales']::public.muscle_group[], 'banda', 'compuesto', 'dominante_rodilla', false,
 false, true, false, 12, 20, null, null, 90, false,
 'La banda aprieta más arriba, así que la parte final de la subida es la que cuesta.',
 'Pisa el centro de la banda con los dos pies, a la anchura de los hombros.
Pasa los extremos por encima de los hombros y sujétalos con las manos a la altura de la clavícula.
Baja llevando la cadera atrás y las rodillas afuera, hasta que la cadera pase la rodilla.
Sube empujando el suelo con todo el pie.',
 'Que la banda se salga del hombro a mitad de serie: ajusta la longitud antes de empezar.
Inclinarse hacia delante porque la banda tira: el torso se queda alto.'),

(null, 'Pallof press con banda', '', 'oblicuos', array['abdominales']::public.muscle_group[], 'banda', 'aislamiento', 'core', true,
 false, true, false, 10, 15, null, null, 60, false,
 'El ejercicio consiste en NO girar. Si te gira, no hay ejercicio.',
 'Ancla la banda a la altura del pecho y ponte de lado a ella.
Coge el extremo con las dos manos y pégalo al esternón.
Da un paso al lado hasta tener tensión, pies a la anchura de los hombros, abdomen apretado.
Estira los brazos hacia delante resistiendo el giro, aguanta un segundo y vuelve al pecho.
Haz todas las repeticiones y cambia de lado.',
 'Dejarse girar el torso.
Inclinarse al lado contrario para compensar: si hace falta, la banda es demasiado dura.');
