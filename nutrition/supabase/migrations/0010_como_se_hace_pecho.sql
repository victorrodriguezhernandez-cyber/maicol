-- Cómo se hace: pecho.
--
-- `how_to` son los pasos para alguien que no ha hecho nunca el ejercicio:
-- dónde te pones, qué agarras, qué se mueve, hasta dónde. Una línea por
-- paso. `mistakes` son los fallos concretos de ESE ejercicio y qué pasa
-- si los cometes — no consejos genéricos: "colócate recto" no le enseña
-- nada a nadie.
--
-- Se actualiza por nombre porque el catálogo compartido tiene índice
-- único por nombre normalizado y los ids se generan al insertar.

update public.exercises set
  how_to = 'Túmbate en el banco con los ojos justo debajo de la barra.
Junta los omóplatos y húndelos hacia los bolsillos, como si guardaras dos lápices entre ellos. Esa postura no se deshace hasta acabar la serie.
Agarra la barra con las manos algo más abiertas que los hombros y rodea el pulgar por debajo, nunca por encima.
Saca la barra y llévala sobre la línea de los hombros.
Baja controlando hasta tocar el pecho a la altura del pezón, con los codos a unos 45° del torso.
Empuja hacia arriba y un poco hacia atrás, hasta estirar los brazos sin bloquear de golpe.'
  ,mistakes = 'Bajar la barra al cuello: acerca el hombro al límite de su recorrido y es donde se producen la mayoría de las lesiones de manguito.
Rebotar la barra en el pecho: te regala repeticiones que no has hecho y descarga la parte más difícil del movimiento.
Despegar el culo del banco para sacar la última: acortas el recorrido y cargas la lumbar en un ejercicio que no es para ella.'
where user_id is null and name = 'Press de banca con barra';

update public.exercises set
  how_to = 'Pon el respaldo entre 30° y 45°. Por encima de 45° el trabajo se va al hombro y deja de ser un ejercicio de pecho.
Siéntate, junta y hunde los omóplatos contra el respaldo.
Agarra algo más abierto que los hombros y saca la barra.
Baja hasta tocar la clavícula o justo por debajo.
Empuja hasta estirar, siguiendo la misma línea por la que ha bajado.'
  ,mistakes = 'Inclinar el banco casi vertical: entonces es un press de hombro con más riesgo.
Bajar la barra al esternón como en banca plana: la trayectoria no corresponde al ángulo y el hombro aguanta la diferencia.'
where user_id is null and name = 'Press de banca inclinado con barra';

update public.exercises set
  how_to = 'Pon el banco declinado y engancha los pies en los soportes ANTES de coger la barra.
Junta y hunde los omóplatos.
Saca la barra y colócala sobre la parte baja del pecho.
Baja hasta tocar por debajo del pezón. El recorrido es más corto que en plano.
Empuja hasta estirar los brazos.'
  ,mistakes = 'Descargar la barra sin tener los pies sujetos: con la cabeza por debajo de la cadera, si resbalas no tienes cómo salir.
Rebotar en el pecho: en declinado el recorrido ya es corto y el rebote lo deja en nada.'
where user_id is null and name = 'Press de banca declinado con barra';

update public.exercises set
  how_to = 'Siéntate en el punta del banco con una mancuerna en cada mano apoyada en el muslo.
Túmbate hacia atrás dando un empujón con las rodillas para subir las mancuernas al pecho.
Junta y hunde los omóplatos, y lleva las mancuernas sobre los hombros con las palmas hacia los pies.
Baja hasta notar estiramiento en el pecho, con los codos a 45° y sin que pasen por detrás de la línea del hombro.
Empuja hacia arriba juntando ligeramente las mancuernas, sin chocarlas.'
  ,mistakes = 'Chocar las mancuernas arriba: al juntarlas se pierde la tensión justo donde el pecho más se contrae.
Dejar caer los codos por detrás del hombro buscando más recorrido: ahí el pecho ya no tira y todo lo aguanta la cápsula del hombro.
Levantarse con las mancuernas en las manos al acabar: bájalas al suelo desde tumbado o déjalas en los muslos y siéntate.'
where user_id is null and name = 'Press de banca con mancuernas';

update public.exercises set
  how_to = 'Respaldo entre 30° y 45°, con una mancuerna en cada mano sobre los muslos.
Túmbate hacia atrás ayudándote de un empujón de rodillas para colocar las mancuernas a la altura del pecho.
Junta y hunde los omóplatos contra el respaldo.
Baja hasta que los codos queden a la altura del torso y notes estiramiento.
Empuja hasta estirar, sin chocar las mancuernas arriba.'
  ,mistakes = 'Cargar el mismo peso que en banca plana: con el banco inclinado el pecho parte en desventaja y el hombro compensa.
Arquear la lumbar para poder empujar más: el ángulo del banco se pierde y vuelves a hacer press plano.'
where user_id is null and name = 'Press inclinado con mancuernas';

update public.exercises set
  how_to = 'Túmbate en un banco plano con una mancuerna en cada mano, brazos estirados sobre el pecho y palmas enfrentadas.
Flexiona un poco los codos y déjalos así de flexionados todo el ejercicio: ese ángulo no cambia.
Abre los brazos en arco hacia los lados, como si abrazaras un barril muy grande, hasta notar estiramiento en el pecho.
Vuelve a juntar por el mismo arco, sin empujar hacia arriba.'
  ,mistakes = 'Estirar y flexionar los codos: eso convierte la apertura en un press y el pecho deja de ser lo que trabaja.
Bajar más allá del estiramiento buscando rango: el hombro se abre más de lo que aguanta y no añade músculo.
Coger demasiado peso: el brazo estirado es una palanca larguísima, así que aquí se usa mucho menos peso del que parece.'
where user_id is null and name = 'Aperturas con mancuernas';

update public.exercises set
  how_to = 'Pon el banco a unos 30°, con una mancuerna en cada mano y los brazos estirados sobre el pecho.
Flexiona ligeramente los codos y fija ese ángulo.
Abre en arco hacia los lados hasta notar estiramiento.
Junta por el mismo arco.'
  ,mistakes = 'Cargar como en la apertura plana: el brazo de palanca es aún más desfavorable y el hombro paga la diferencia.
Subir los hombros hacia las orejas al abrir: el trapecio entra y el pecho sale.'
where user_id is null and name = 'Aperturas inclinadas con mancuernas';

update public.exercises set
  how_to = 'Sube las dos poleas hasta arriba y coge un agarre en cada mano.
Ponte en el centro y da un paso adelante, con un pie algo avanzado: así hay tensión desde la primera repetición.
Inclina un poco el torso hacia delante y flexiona ligeramente los codos.
Junta las manos por delante hasta que se crucen a la altura del ombligo.
Vuelve controlando hasta notar estiramiento, sin dejar que las poleas tiren de ti.'
  ,mistakes = 'Quedarse de pie en la vertical de las poleas: al principio del recorrido no hay tensión y media serie se va en nada.
Parar las manos a la altura del pecho: el cruce es justo la parte donde el pecho se contrae del todo.
Flexionar y estirar los codos: otra vez un press disfrazado.'
where user_id is null and name = 'Cruce de poleas desde arriba';

update public.exercises set
  how_to = 'Baja las dos poleas al punto más bajo y coge un agarre en cada mano.
Ponte en el centro, un paso adelante, torso ligeramente inclinado.
Con los codos algo flexionados y fijos, sube las manos en arco hacia delante y arriba.
Termina con las manos juntas a la altura de la barbilla.
Baja controlando por el mismo arco.'
  ,mistakes = 'Encoger los hombros al subir: el trabajo se va al deltoides anterior.
Tirar con los brazos rectos y rígidos: sin nada de flexión en el codo la tensión se la come la articulación.'
where user_id is null and name = 'Cruce de poleas desde abajo';

update public.exercises set
  how_to = 'Ajusta el asiento para que las empuñaduras queden a la altura del pecho, no de la cara ni del abdomen.
Siéntate con la espalda pegada al respaldo y los omóplatos hundidos.
Agarra las empuñaduras con los codos algo flexionados.
Junta hasta que las manos casi se toquen y aprieta un segundo.
Vuelve controlando hasta notar estiramiento, sin dejar que el peso te abra de golpe.'
  ,mistakes = 'Asiento mal puesto: si las manos quedan por encima del pecho el hombro trabaja más que el pecho.
Soltar el peso de golpe en la vuelta: la fase de bajada es la mitad del estímulo y la máquina te la regala si la dejas.'
where user_id is null and name = 'Contractor de pecho en máquina';

update public.exercises set
  how_to = 'Ajusta el asiento para que las empuñaduras queden a la altura de la mitad del pecho.
Siéntate con la espalda apoyada y los omóplatos juntos y hundidos.
Empuja hacia delante hasta estirar los brazos sin bloquear.
Vuelve controlando hasta que las manos queden a la altura del pecho.'
  ,mistakes = 'Separar la espalda del respaldo para empujar más: pierdes la base y el hombro se adelanta.
Bloquear los codos con fuerza al final: la tensión se va del músculo a la articulación.'
where user_id is null and name = 'Press de pecho en máquina';

update public.exercises set
  how_to = 'Súbete a las paralelas con los brazos estirados y el cuerpo suspendido.
Inclina el torso hacia delante unos 30° y cruza los tobillos por detrás: esa inclinación es lo que lo convierte en pecho.
Baja dejando que los codos se abran un poco hacia fuera, hasta notar estiramiento en el pecho.
Empuja hasta estirar los brazos manteniendo la inclinación.'
  ,mistakes = 'Mantener el torso vertical: entonces es un fondo de tríceps, no de pecho.
Bajar hasta el final del recorrido el primer día: el hombro en esa posición está muy abierto y necesita adaptarse. Baja hasta donde controles y ve ganando rango.
Balancear las piernas para subir: la repetición la hace la inercia.'
where user_id is null and name = 'Fondos en paralelas para pecho';

update public.exercises set
  how_to = 'Manos en el suelo algo más abiertas que los hombros, a la altura del pecho.
Estira las piernas y apoya las puntas de los pies. El cuerpo es una línea recta de la cabeza a los talones.
Aprieta abdomen y glúteo para que esa línea no se rompa.
Baja doblando los codos hacia atrás y afuera hasta que el pecho quede a un puño del suelo.
Empuja hasta estirar los brazos, sin que la cadera suba antes que el pecho.'
  ,mistakes = 'Dejar caer la cadera: la lumbar se arquea y el abdomen deja de sostener nada.
Subir el culo primero: es media flexión, aunque parezca completa.
Abrir los codos a 90° del torso: carga el hombro sin dar más pecho.
Si no te sale ninguna completa, apoya las rodillas o pon las manos en un banco. Bajar la dificultad es progresar; hacerlas mal no.'
where user_id is null and name = 'Flexiones';

update public.exercises set
  how_to = 'Apoya las manos en el suelo y los pies en un banco o escalón, más altos que la cabeza.
Cuerpo en línea recta de la cabeza a los talones, abdomen y glúteo apretados.
Baja hasta que el pecho quede cerca del suelo, codos hacia atrás y afuera.
Empuja hasta estirar los brazos.'
  ,mistakes = 'Empezar con los pies muy altos: cuanto más alto el apoyo, más peso llevas y más trabaja el hombro. Sube la altura poco a poco.
Arquear la lumbar al cansarte: para la serie ahí, no es una repetición más.'
where user_id is null and name = 'Flexiones declinadas';

update public.exercises set
  how_to = 'Coloca el banco en el multipower de forma que la barra, al bajar, caiga sobre la mitad de tu pecho.
Túmbate, junta y hunde los omóplatos.
Gira la barra para liberarla de los ganchos de seguridad.
Baja hasta el pecho y empuja hasta estirar. La guía lleva la trayectoria: tú sólo controlas la velocidad.
Pon los seguros a la altura de tu pecho antes de empezar la última serie.'
  ,mistakes = 'Colocar el banco sin comprobar dónde cae la barra: la guía no perdona, y si la línea no pasa por el pecho el hombro compensa en cada repetición.
Confiar en que la máquina es segura y no poner los seguros: si fallas, la barra baja igual.'
where user_id is null and name = 'Press de pecho en multipower';
