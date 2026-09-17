-- Cómo se hace: isquiotibiales, glúteo y gemelos. Ver 0010.

update public.exercises set
  how_to = 'Barra en el suelo, sobre la mitad del pie. Pies a la anchura de la cadera.
Baja a coger la barra doblando cadera y rodillas, con la espalda recta y los brazos estirados por fuera de las piernas.
Antes de tirar: pecho alto, hombros justo por delante de la barra, abdomen apretado y espalda recta. Esa posición es la que aguanta el peso.
Empuja el suelo con las piernas y sube la barra pegada a las espinillas, sin que la cadera suba antes que el pecho.
Termina de pie, con la cadera extendida y el glúteo apretado. No te eches hacia atrás.
Baja llevando la cadera atrás primero y doblando las rodillas cuando la barra pase las rodillas.'
  ,mistakes = 'Subir la cadera antes que el pecho: la espalda se redondea y la lumbar se lleva un peso que no es para ella. Es el fallo que más lesiona en este ejercicio.
Separar la barra de las piernas: cada centímetro de distancia multiplica la carga en la espalda baja.
Echarse hacia atrás al final: el peso no sube más y la columna se comprime hacia atrás.
Redondear la espalda al coger la barra del suelo: si no la puedes mantener recta desde abajo, usa menos peso o parte de unos soportes.'
where user_id is null and name = 'Peso muerto convencional';

update public.exercises set
  how_to = 'De pie con la barra en las manos, agarre prono, brazos estirados, barra apoyada en los muslos.
Pies a la anchura de la cadera, rodillas con una flexión mínima que NO cambia durante el movimiento.
Lleva la cadera hacia atrás dejando que la barra baje pegada a las piernas.
Baja hasta notar estiramiento en la parte de atrás del muslo, normalmente con la barra por la mitad de la espinilla.
Vuelve empujando la cadera hacia delante y apretando el glúteo.'
  ,mistakes = 'Doblar las rodillas para bajar más: se convierte en un peso muerto convencional y el isquio deja de estirarse.
Redondear la espalda al final del recorrido: tu tope es donde la espalda sigue recta, no donde llega la barra.
Separar la barra de las piernas.'
where user_id is null and name = 'Peso muerto rumano con barra';

update public.exercises set
  how_to = 'De pie con una mancuerna en cada mano delante de los muslos, piernas casi rectas.
Lleva la cadera atrás bajando las mancuernas pegadas a las piernas, con la espalda recta.
Baja hasta notar estiramiento detrás del muslo.
Vuelve empujando la cadera hacia delante.'
  ,mistakes = 'Confundir "piernas rígidas" con "rodillas bloqueadas": una flexión mínima quita tensión de la rodilla sin quitar estiramiento al isquio.
Bajar por sensación de rango y no por donde aguanta la espalda.'
where user_id is null and name = 'Peso muerto piernas rígidas con mancuernas';

update public.exercises set
  how_to = 'De pie sobre una pierna, con una mancuerna en la mano del lado contrario (o en las dos).
Lleva la cadera atrás mientras la pierna libre se estira hacia detrás, hasta que el torso quede casi paralelo al suelo.
La cadera no se abre: las dos crestas mirando al suelo.
Baja hasta notar estiramiento y vuelve apretando el glúteo de la pierna de apoyo.'
  ,mistakes = 'Abrir la cadera al bajar: es más fácil, pero el isquio y el glúteo dejan de trabajar como tienen que trabajar.
Empezar con peso: primero controla el equilibrio con las manos vacías.'
where user_id is null and name = 'Peso muerto a una pierna';

update public.exercises set
  how_to = 'Pon la barra en el rack a la altura del pecho y apóyala en el trapecio como en una sentadilla.
Saca la barra y da dos pasos atrás, pies a la anchura de la cadera, rodillas con flexión mínima.
Lleva la cadera atrás e inclina el torso hacia delante, con la espalda recta.
Baja hasta que el torso quede casi paralelo al suelo, o hasta donde la espalda siga recta.
Vuelve empujando la cadera hacia delante.'
  ,mistakes = 'Cargar como en una sentadilla: la barra está lejísimo de la cadera y la palanca es enorme. Aquí se usa una fracción del peso.
Redondear la espalda: con la barra en la espalda no hay margen. Baja el peso o reduce el rango.'
where user_id is null and name = 'Buenos días con barra';

update public.exercises set
  how_to = 'Túmbate boca abajo en la máquina con la almohadilla justo por encima de los talones y las rodillas por fuera del borde del banco.
Agarra las asas y apoya la cadera en el banco.
Dobla las rodillas llevando los talones al culo y aprieta un segundo.
Baja controlando hasta estirar las piernas del todo.'
  ,mistakes = 'Levantar la cadera del banco para subir más: es la señal de que el peso es excesivo, y la lumbar aguanta el arco.
No estirar del todo al bajar: el isquio pierde justo la parte del recorrido donde más se estira.'
where user_id is null and name = 'Curl femoral tumbado';

update public.exercises set
  how_to = 'Siéntate en la máquina con la espalda apoyada y la almohadilla superior ajustada sobre los muslos.
La almohadilla de las piernas queda justo por encima de los talones, con las rodillas alineadas con el eje de giro.
Dobla las rodillas llevando los talones hacia abajo y atrás, y aprieta un segundo.
Vuelve controlando hasta estirar.'
  ,mistakes = 'No ajustar la almohadilla de los muslos: la cadera se levanta y el recorrido se acorta.
Deslizar el culo hacia delante en las últimas repeticiones.'
where user_id is null and name = 'Curl femoral sentado';

update public.exercises set
  how_to = 'Arrodíllate sobre algo blando con los tobillos sujetos por un compañero o un soporte.
Cuerpo recto desde las rodillas a la cabeza, abdomen apretado.
Baja el cuerpo hacia delante lo más despacio que puedas, frenando con los isquios.
Cuando ya no puedas frenar, apoya las manos, empuja lo justo para volver y sigue.'
  ,mistakes = 'Doblar la cadera al bajar: se convierte en un ejercicio distinto y mucho más fácil.
Dejarse caer y frenar sólo al final: todo el valor está en frenar desde arriba.
Empezar sin ayuda de las manos: casi nadie controla el recorrido completo al principio, y no pasa nada.'
where user_id is null and name = 'Curl nórdico';

update public.exercises set
  how_to = 'Siéntate en el suelo con la espalda apoyada en un banco, a lo largo de los omóplatos.
Rueda una barra con discos hasta la cadera y pon una almohadilla o colchoneta debajo.
Pies a la anchura de la cadera, a un paso del culo, rodillas a unos 90° cuando estés arriba.
Empuja el suelo con los talones y sube la cadera hasta que el cuerpo forme una línea recta de los hombros a las rodillas.
Aprieta el glúteo un segundo arriba, con las costillas hacia abajo y sin arquear la lumbar.
Baja controlando hasta casi tocar el suelo.'
  ,mistakes = 'Arquear la lumbar arriba en vez de extender la cadera: la sensación de "arriba del todo" la da la columna y el glúteo ni se entera. Mete las costillas y aprieta el abdomen.
Poner los pies demasiado lejos: el trabajo se va al isquio.
Subir sólo media cadera con mucho peso: el glúteo se contrae del todo justo en el último tramo.'
where user_id is null and name = 'Hip thrust con barra';

update public.exercises set
  how_to = 'Siéntate en la máquina de hip thrust con la espalda apoyada y el cinturón o la almohadilla sobre la cadera.
Pies en la plataforma a la anchura de la cadera.
Empuja la cadera hacia delante hasta extenderla del todo y aprieta el glúteo.
Vuelve controlando.'
  ,mistakes = 'Arquear la lumbar para llegar más arriba.
Empujar con las puntas de los pies: empuja con todo el pie o con el talón.'
where user_id is null and name = 'Hip thrust en máquina';

update public.exercises set
  how_to = 'Túmbate boca arriba con las rodillas dobladas y los pies apoyados a la anchura de la cadera, cerca del culo.
Aprieta el abdomen para que las costillas queden abajo.
Empuja el suelo con los talones y sube la cadera hasta formar una línea de los hombros a las rodillas.
Aprieta el glúteo un segundo y baja controlando.'
  ,mistakes = 'Subir arqueando la lumbar: es lo que pasa cuando el glúteo no llega y la espalda compensa.
Poner los pies lejos del culo: el isquio se queda el trabajo.
Si ya te resulta fácil, pásate al hip thrust o pon un disco en la cadera. Repetir 40 sin resistencia no progresa.'
where user_id is null and name = 'Puente de glúteo en suelo';

update public.exercises set
  how_to = 'Ponte delante de un cajón o banco firme que te llegue por debajo de la rodilla.
Pon un pie entero encima.
Sube empujando con ese pie, sin dar impulso con el de abajo, hasta estirar la pierna arriba.
Baja controlando con la misma pierna hasta apoyar el otro pie.
Haz todas las repeticiones y cambia.'
  ,mistakes = 'Dar un salto con la pierna de abajo: la repetición la hace el impulso.
Empujar con la punta del pie de arriba: apoya todo el pie.
Cajón demasiado alto: por encima de la rodilla la cadera trabaja en un rango donde casi nadie controla la posición.'
where user_id is null and name = 'Subida al cajón';

update public.exercises set
  how_to = 'De pie, da un paso largo hacia ATRÁS y baja doblando las dos rodillas.
Baja hasta que la rodilla de atrás casi toque el suelo, con el torso ligeramente inclinado hacia delante.
Empuja con el pie de delante para volver de pie.
Alterna piernas.'
  ,mistakes = 'Dar el paso corto: la rodilla de delante se adelanta y la rótula paga.
Apoyar el talón del pie de atrás: va sólo la punta.
Confundir esta variante con la zancada hacia delante: aquí el pie que se mueve es el de atrás, y eso es lo que le quita el golpe a la rodilla de delante.'
where user_id is null and name = 'Zancada inversa';

update public.exercises set
  how_to = 'Siéntate en la máquina de abductores con las almohadillas por fuera de los muslos y la espalda apoyada.
Abre las piernas empujando hacia fuera hasta el final del recorrido.
Aprieta un segundo y vuelve controlando.'
  ,mistakes = 'Echar el torso hacia delante para mover más peso: cambia qué parte del glúteo trabaja y suele ser sólo para cargar más.
Volver de golpe dejando que las almohadillas te cierren las piernas.'
where user_id is null and name = 'Abducción de cadera en máquina';

update public.exercises set
  how_to = 'Ponte una tobillera enganchada a la polea baja, en la pierna más lejana a la torre.
Ponte de lado, sujetándote a la máquina.
Abre la pierna hacia fuera, estirada, hasta donde llegue sin que la cadera se gire.
Vuelve controlando.'
  ,mistakes = 'Inclinar el torso al lado contrario para subir más la pierna: el rango extra sale de la columna.
Doblar la rodilla.'
where user_id is null and name = 'Abducción de cadera en polea';

update public.exercises set
  how_to = 'Ponte una tobillera enganchada a la polea baja.
Ponte de frente a la torre, sujetándote con las manos, con el peso en la pierna de apoyo.
Lleva la pierna de la tobillera hacia atrás, estirando la cadera, sin arquear la lumbar.
Aprieta el glúteo arriba y vuelve controlando.'
  ,mistakes = 'Arquear la lumbar para subir más la pierna: el recorrido lo hace la espalda y el glúteo no llega a contraerse más.
Coger peso: con el brazo de palanca de una pierna entera, poco peso ya es mucho.'
where user_id is null and name = 'Patada de glúteo en polea';

update public.exercises set
  how_to = 'Ponte de pie en la máquina de gemelos con los hombros bajo las almohadillas y las puntas de los pies en el escalón, con los talones por fuera.
Estira las piernas.
Baja los talones todo lo que puedas hasta notar estiramiento en el gemelo.
Sube hasta ponerte lo más de puntillas posible y aguanta un segundo arriba.
Baja controlando.'
  ,mistakes = 'Rebotar arriba y abajo: el gemelo tiene un tendón muy elástico y el rebote hace casi todo el trabajo. Para arriba y abajo.
Hacer un recorrido de dos centímetros: el rango completo, del estiramiento máximo a la punta máxima, es donde está el ejercicio.
Doblar las rodillas: entonces trabaja el sóleo y no el gemelo, que es otro ejercicio (el sentado).'
where user_id is null and name = 'Elevación de talones de pie';

update public.exercises set
  how_to = 'Siéntate en la máquina de gemelo sentado con las almohadillas sobre los muslos y las puntas de los pies en el escalón.
Las rodillas quedan dobladas a 90°: eso es lo que pasa el trabajo al sóleo, el músculo de debajo del gemelo.
Baja los talones hasta notar estiramiento.
Sube hasta arriba, aguanta un segundo y baja controlando.'
  ,mistakes = 'Rebotar.
Pensar que sustituye al gemelo de pie: con la rodilla doblada el gemelo apenas trabaja. Son dos ejercicios distintos, no dos versiones del mismo.'
where user_id is null and name = 'Elevación de talones sentado';

update public.exercises set
  how_to = 'Pon la barra del multipower en el trapecio y coloca un escalón o disco grueso bajo las puntas de los pies.
Estira las piernas y suelta la barra de los seguros.
Baja los talones hasta notar estiramiento.
Sube todo lo que puedas, aguanta arriba y baja controlando.'
  ,mistakes = 'No usar escalón: sin él pierdes la mitad del recorrido, la del estiramiento.
Rebotar con el peso de la barra.'
where user_id is null and name = 'Elevación de talones en multipower';

update public.exercises set
  how_to = 'Siéntate en la prensa y pon sólo las puntas de los pies en la parte baja de la plataforma.
Estira las piernas y quita los seguros con cuidado.
Deja que la plataforma empuje los talones hacia ti hasta notar estiramiento.
Empuja con las puntas hasta el final del recorrido y vuelve controlando.'
  ,mistakes = 'Quitar los seguros con las rodillas dobladas: si el pie resbala, la plataforma baja con todo el peso y no tienes cómo pararla.
Doblar las rodillas para empujar: sólo se mueve el tobillo.'
where user_id is null and name = 'Elevación de talones en prensa';

update public.exercises set
  how_to = 'Ponte de pie sobre un escalón con la punta de un pie apoyada y el otro pie recogido.
Sujétate con una mano a algo firme.
Baja el talón hasta notar estiramiento.
Sube hasta lo más alto que llegues y aguanta un segundo.
Haz todas las repeticiones y cambia de pie.'
  ,mistakes = 'Empujarte con la mano que te sujeta: la mano sólo equilibra.
Rebotar: sin peso externo es aún más tentador, y el tendón se lo lleva todo.'
where user_id is null and name = 'Elevación de talones a una pierna';
