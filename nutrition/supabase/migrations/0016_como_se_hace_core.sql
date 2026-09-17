-- Cómo se hace: abdominales, oblicuos, lumbares y los dos de agarre.
-- Ver 0010. Los de tiempo (planchas, hollow, colgarse, granjero) llevan
-- los pasos escritos en segundos, no en repeticiones, porque es lo que
-- se apunta de ellos (migración 0008).

update public.exercises set
  how_to = 'Túmbate boca arriba con las rodillas dobladas y los pies apoyados.
Pon las manos en el pecho o en las sienes, sin tirar del cuello.
Mete el mentón un poco y despega los omóplatos del suelo enrollando la columna, como si te acercaras las costillas a la cadera.
Sube sólo hasta que los omóplatos se despeguen: no hace falta sentarse.
Baja controlando hasta apoyar del todo.'
  ,mistakes = 'Tirar de la cabeza con las manos: el cuello se dobla y el abdomen hace menos.
Sentarse del todo: pasado el despegue de los omóplatos, el trabajo lo hace el flexor de la cadera.
Hacer 50 rápidas: el abdomen responde a la carga y al control como cualquier otro músculo. Si te salen 30 fáciles, coge un disco.'
where user_id is null and name = 'Crunch en suelo';

update public.exercises set
  how_to = 'Túmbate en un banco declinado con las piernas enganchadas arriba.
Manos en el pecho.
Enrolla la columna subiendo los omóplatos y acercando las costillas a la cadera.
Sube hasta unos 30° y baja controlando sin dejarte caer.'
  ,mistakes = 'Subir hasta quedarte sentado: el flexor de la cadera se lleva el trabajo y la lumbar se comprime.
Dejarse caer al final: la bajada es la mitad del ejercicio y en declinado es la parte fácil de regalar.'
where user_id is null and name = 'Encogimientos en banco declinado';

update public.exercises set
  how_to = 'Pon una cuerda en la polea alta y arrodíllate de espaldas o de frente a la torre.
Coge la cuerda con las dos manos y llévala a los lados de la cabeza, con los codos abajo.
Sin mover la cadera, enrolla la columna llevando los codos hacia los muslos.
Aprieta abajo y vuelve controlando hasta estirar la columna.'
  ,mistakes = 'Bajar doblando la cadera, como si hicieras una reverencia: la columna no se enrolla y el abdomen casi no trabaja.
Tirar con los brazos: los brazos sólo sujetan la cuerda, el movimiento lo hace la columna.
Sentarse en los talones al bajar.'
where user_id is null and name = 'Crunch en polea arrodillado';

update public.exercises set
  how_to = 'Ajusta el asiento de la máquina para que el eje de giro quede a la altura del abdomen.
Siéntate y agarra las asas o cruza los brazos sobre las almohadillas.
Enrolla el torso hacia delante acercando las costillas a la cadera.
Vuelve controlando.'
  ,mistakes = 'Empujar con los brazos: son sólo el punto de apoyo.
Doblar la cadera en vez de la columna.'
where user_id is null and name = 'Crunch abdominal en máquina';

update public.exercises set
  how_to = 'Cuélgate de una barra con los brazos estirados y los hombros activos (omóplatos algo bajados).
Aprieta el abdomen para que la lumbar no se arquee.
Sube las rodillas hacia el pecho enrollando la pelvis hacia arriba al final: ese enrollado es lo que hace trabajar al abdomen y no sólo a la cadera.
Baja controlando, sin balancearte.'
  ,mistakes = 'Balancearse: la mitad de la subida la hace la inercia.
Subir las rodillas sin enrollar la pelvis: entonces sólo trabaja el flexor de la cadera.
Dejarse caer de golpe abajo: es donde el hombro está más estirado.'
where user_id is null and name = 'Elevación de rodillas colgado';

update public.exercises set
  how_to = 'Cuélgate de una barra con los brazos estirados y los hombros activos.
Aprieta el abdomen.
Sube las piernas ESTIRADAS hasta que queden paralelas al suelo o más arriba, enrollando la pelvis al final.
Baja controlando hasta que el cuerpo quede recto.'
  ,mistakes = 'Doblar las rodillas: entonces es la versión de rodillas, que está bien pero es más fácil. Si no te salen con las piernas rectas, haz ésa.
Balancearse.
No enrollar la pelvis arriba: sin eso, el recto del abdomen apenas se acorta.'
where user_id is null and name = 'Elevación de piernas colgado';

update public.exercises set
  how_to = 'Arrodíllate en el suelo con la rueda delante, agarrada con las dos manos.
Aprieta abdomen y glúteo: la lumbar tiene que quedarse neutra todo el recorrido.
Rueda hacia delante estirando el cuerpo, sin dejar que la cadera se hunda.
Llega hasta donde puedas mantener la lumbar sin arquearse.
Vuelve tirando con el abdomen, no con los brazos.'
  ,mistakes = 'Dejar que la lumbar se arquee al estirarse: es el fallo que convierte este ejercicio en un dolor de espalda. Tu rango es donde la lumbar aguanta.
Tirar con los brazos y la cadera para volver: el abdomen deja de trabajar justo en la parte que importa.
Intentar la versión de pie antes de controlar la de rodillas en todo el recorrido.'
where user_id is null and name = 'Rueda abdominal';

update public.exercises set
  how_to = 'Apoya los antebrazos y las puntas de los pies en el suelo, codos justo debajo de los hombros.
Aprieta el abdomen y el glúteo y mete un poco la pelvis, hasta que la espalda quede plana — ni arqueada ni curvada.
Cuerpo en línea recta de la cabeza a los talones.
Aguanta ahí los segundos que toque, respirando con normalidad.'
  ,mistakes = 'Dejar caer la cadera: la lumbar se arquea y el abdomen deja de sostener.
Subir el culo: es más fácil de aguantar, pero ya no es la misma posición.
Aguantar tres minutos: pasado el medio minuto largo se entrena la resistencia de la postura, no la fuerza. Si aguantas mucho, pon peso en la espalda o haz una versión más difícil en vez de alargar el tiempo.
Aguantar la respiración.'
where user_id is null and name = 'Plancha frontal';

update public.exercises set
  how_to = 'Túmbate de lado y apoya el antebrazo en el suelo, codo justo debajo del hombro.
Apila los pies uno sobre otro o pon el de arriba delante.
Sube la cadera hasta que el cuerpo quede en línea recta vista de frente y de lado.
Aguanta los segundos que toque y cambia de lado.'
  ,mistakes = 'Dejar caer la cadera hacia el suelo.
Girar el torso hacia el suelo: la cadera y los hombros quedan apilados; si giras, dejas de trabajar el oblicuo.
Hacer sólo un lado: se hacen los dos, aunque uno salga peor. El que sale peor es justo el que hay que trabajar.'
where user_id is null and name = 'Plancha lateral';

update public.exercises set
  how_to = 'Túmbate boca arriba y aprieta la lumbar contra el suelo metiendo la pelvis. Esa presión es la posición: si la pierdes, el ejercicio se acaba.
Levanta los brazos por encima de la cabeza y las piernas estiradas, hasta que el cuerpo forme una C poco profunda.
Baja los brazos y las piernas tanto como puedas SIN que la lumbar se despegue del suelo.
Aguanta ahí los segundos que toque.'
  ,mistakes = 'Bajar las piernas hasta que la lumbar se arquea: en cuanto se despega, el abdomen ya no sostiene nada y la espalda aguanta el peso de las piernas.
Si no puedes mantener la lumbar pegada, dobla las rodillas o sube los brazos. Eso es la progresión.
Aguantar la respiración.'
where user_id is null and name = 'Hollow hold';

update public.exercises set
  how_to = 'Siéntate en el suelo con las rodillas dobladas y los pies apoyados o levantados.
Inclina el torso hacia atrás unos 45°, con la espalda recta.
Sujeta un disco o una mancuerna con las dos manos delante del pecho.
Gira el torso hacia un lado llevando el peso al lado de la cadera, y luego al otro. Cada lado es media repetición.'
  ,mistakes = 'Mover sólo los brazos y dejar el torso quieto: el oblicuo no gira nada.
Redondear la espalda al inclinarse: la lumbar aguanta la rotación.
Ir a toda velocidad con mucho peso: la rotación rápida bajo carga es lo que más lesiona en este ejercicio.'
where user_id is null and name = 'Giro ruso';

update public.exercises set
  how_to = 'De pie con una mancuerna en una mano, brazo estirado al costado.
Pies a la anchura de la cadera, abdomen apretado.
Inclínate hacia el lado de la mancuerna, dejándola bajar por la pierna, sin girar el torso ni echarlo hacia delante.
Vuelve arriba apretando el oblicuo del lado contrario. Haz todas las repeticiones y cambia.'
  ,mistakes = 'Coger peso en las dos manos: se equilibran y no queda ejercicio.
Girar o inclinarse hacia delante: el movimiento es puramente lateral.
Usar mucho peso: el oblicuo es pequeño y la columna es la que aguanta la palanca.'
where user_id is null and name = 'Inclinación lateral con mancuerna';

update public.exercises set
  how_to = 'Pon la polea arriba con una cuerda o un agarre de una mano.
Ponte de lado a la torre, con los pies a la anchura de los hombros y las rodillas algo flexionadas.
Coge el agarre con las dos manos, brazos casi estirados, arriba y al lado de la cabeza.
Tira en diagonal hacia la cadera del lado contrario, girando el torso y dejando que el pie de atrás pivote.
Vuelve controlando y cambia de lado al acabar.'
  ,mistakes = 'Tirar sólo con los brazos: el giro lo hace el torso, los brazos van rígidos.
No dejar pivotar el pie: la rodilla se queda la rotación que debería hacer la cadera.'
where user_id is null and name = 'Leñador en polea';

update public.exercises set
  how_to = 'Pon la polea a la altura del pecho con un agarre de una mano.
Ponte de lado a la torre y coge el agarre con las dos manos, pegado al esternón.
Da un paso al lado hasta tener tensión, pies a la anchura de los hombros, abdomen apretado.
Estira los brazos hacia delante. La polea intentará girarte: el ejercicio es NO girar.
Aguanta un segundo con los brazos estirados y vuelve al pecho. Cambia de lado.'
  ,mistakes = 'Dejarse girar: no hay ejercicio; todo consiste en resistir la rotación.
Coger tanto peso que tengas que inclinarte: el torso se queda vertical.
Aguantar la respiración: se respira normal aunque el abdomen esté apretado.'
where user_id is null and name = 'Pallof press';

update public.exercises set
  how_to = 'Ajusta el banco romano para que el borde de la almohadilla quede justo por debajo de la cresta de la cadera.
Engancha los talones bajo los rodillos y cruza los brazos al pecho.
Baja doblando la cadera, con la espalda recta, hasta notar estiramiento detrás del muslo.
Sube hasta que el cuerpo quede en línea recta y para ahí.'
  ,mistakes = 'Subir por encima de la línea del cuerpo, arqueando la espalda: comprime la lumbar y no aporta nada.
Redondear la espalda al bajar: se carga el disco intervertebral en flexión, que es lo que este ejercicio debería fortalecer, no provocar.
Poner la almohadilla demasiado alta, sobre el abdomen: no puedes doblar la cadera y el movimiento lo hace la columna.'
where user_id is null and name = 'Hiperextensiones en banco romano';

update public.exercises set
  how_to = 'Siéntate en la máquina de extensión lumbar con la espalda apoyada en la almohadilla y el cinturón o las piernas sujetas.
Empuja hacia atrás extendiendo la espalda hasta quedar recto.
Vuelve controlando hasta el punto donde empieza a haber tensión.'
  ,mistakes = 'Extenderse hacia atrás más allá de recto.
Empezar con mucho peso: la lumbar responde bien al trabajo directo, pero muy mal a que se le meta peso de golpe.'
where user_id is null and name = 'Extensión lumbar en máquina';

update public.exercises set
  how_to = 'Túmbate boca abajo con los brazos estirados por delante de la cabeza y las piernas estiradas.
Aprieta el glúteo.
Sube al mismo tiempo los brazos y las piernas unos centímetros del suelo, alargando el cuerpo.
Aguanta un segundo arriba y baja controlando.'
  ,mistakes = 'Subir todo lo posible arqueando mucho: el objetivo es alargar, no arquear. Unos centímetros ya es el rango.
Levantar la cabeza mirando al techo: el cuello sigue la línea de la espalda.'
where user_id is null and name = 'Superman en suelo';

update public.exercises set
  how_to = 'Agarra una barra fija con las palmas hacia delante, a la anchura de los hombros.
Cuélgate con los brazos estirados y los pies sin tocar el suelo.
Deja los hombros activos, no del todo sueltos, y aprieta un poco el abdomen para no balancearte.
Aguanta los segundos que toque y baja.'
  ,mistakes = 'Colgarse del todo con los hombros muertos el primer día: al hombro hay que darle tiempo a acostumbrarse a sostener el cuerpo.
Balancearse: haz la cuenta quieto.
Bajar de golpe al final: apoya los pies antes de soltar.'
where user_id is null and name = 'Colgarse de la barra';

update public.exercises set
  how_to = 'Pon una mancuerna o kettlebell pesada a cada lado, o usa dos asas de granjero.
Ponte en medio, baja doblando cadera y rodillas con la espalda recta, y agárralas.
Levántate empujando el suelo, con el pecho alto y los hombros hacia atrás.
Camina con pasos cortos y rápidos, sin inclinarte a los lados, durante los segundos que toque.
Deja los pesos en el suelo doblando las rodillas, no soltándolos de golpe.'
  ,mistakes = 'Encoger los hombros hacia las orejas: el trapecio se agarrota y el agarre aguanta peor.
Inclinar el torso a un lado: si pasa, los pesos son distintos o hay demasiado.
Dar pasos largos: se pierde el equilibrio y la cadera bascula.
Contarlo en repeticiones: este ejercicio se mide en segundos y en kilos, y la app tiene casilla para las dos cosas.'
where user_id is null and name = 'Paseo del granjero';
