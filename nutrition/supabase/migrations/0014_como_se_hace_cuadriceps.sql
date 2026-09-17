-- Cómo se hace: cuádriceps y aductores. Ver 0010.

update public.exercises set
  how_to = 'Pon la barra en el rack a la altura de la parte alta del pecho y carga los discos con seguros.
Métete debajo y apoya la barra en el trapecio, justo por debajo del hueso del cuello — nunca en las cervicales.
Agarra la barra con las manos y aprieta los codos hacia abajo para crear una plataforma firme.
Saca la barra con las dos piernas y da dos pasos atrás. Pies a la anchura de los hombros, puntas ligeramente hacia fuera.
Coge aire, aprieta el abdomen y baja llevando la cadera atrás y las rodillas afuera, como si te sentaras entre los talones.
Baja hasta que la cadera pase por debajo de la rodilla, o hasta donde puedas sin que la espalda se redondee.
Sube empujando el suelo con todo el pie, sin adelantar las rodillas.'
  ,mistakes = 'Apoyar la barra en el cuello: en las cervicales hace daño y no hay forma de acostumbrarse. Va en el músculo del trapecio, un dedo más abajo.
Levantar los talones y subir de puntillas: el peso se va a la punta y la rodilla se adelanta. Empuja con todo el pie.
Meter las rodillas hacia dentro al subir: pasa siempre cuando el peso es mayor del que aguantas. Baja el peso.
Redondear la espalda baja en el fondo: para ahí y haz ese rango. Ganar profundidad a costa de la columna no es progresar.
No poner los seguros del rack a tu altura: es lo que te deja fallar sin que te caiga la barra encima.'
where user_id is null and name = 'Sentadilla trasera con barra';

update public.exercises set
  how_to = 'Pon la barra en el rack a la altura del pecho.
Apoya la barra en la parte delantera de los hombros, tocando la clavícula, y sujétala con los dedos por debajo mientras levantas los codos hacia delante.
Saca la barra y da dos pasos atrás, pies a la anchura de los hombros.
Baja con el torso lo más vertical posible, rodillas hacia fuera.
Baja hasta que la cadera pase la rodilla y sube empujando el suelo, sin dejar caer los codos.'
  ,mistakes = 'Dejar caer los codos: la barra rueda hacia delante y se cae. Los codos altos son lo que la sostiene.
Intentar el mismo peso que en la sentadilla trasera: en frontal sale menos siempre, porque el torso vertical no permite ayudarse con la cadera.
Forzar la muñeca con un agarre completo si no tienes movilidad: usa el agarre cruzado con los brazos.'
where user_id is null and name = 'Sentadilla frontal';

update public.exercises set
  how_to = 'Pon la barra del multipower a la altura de los hombros y métete debajo, barra en el trapecio.
Coloca los pies algo por delante del cuerpo: la guía no te deja llevar la cadera atrás, así que el pie compensa.
Gira la barra para liberarla y baja doblando las rodillas hasta que la cadera pase la rodilla.
Sube empujando con todo el pie.'
  ,mistakes = 'Poner los pies debajo del cuerpo como en la sentadilla libre: con la guía fija, la rodilla se adelanta muchísimo y la rótula lo paga.
Confiar en la guía y no poner los seguros a la altura del fondo de tu sentadilla.'
where user_id is null and name = 'Sentadilla en multipower';

update public.exercises set
  how_to = 'Coge una mancuerna o una kettlebell y sujétala contra el pecho con las dos manos, como una copa.
Pies a la anchura de los hombros, puntas ligeramente hacia fuera.
Baja llevando la cadera atrás y las rodillas afuera, con el torso vertical: el peso delante te ayuda a mantenerlo.
Baja hasta que la cadera pase la rodilla y sube empujando el suelo.'
  ,mistakes = 'Dejar que el peso se separe del pecho: en cuanto se aleja, la espalda baja aguanta la palanca.
Quedarse en un cuarto de sentadilla: es la variante más fácil de hacer profunda, así que aprovéchala para eso.'
where user_id is null and name = 'Sentadilla goblet';

update public.exercises set
  how_to = 'Ponte de espaldas a un banco y apoya el empeine o la punta del pie de atrás encima.
El pie de delante, a un paso largo: cuando bajes, la rodilla no debe pasar mucho la punta del pie.
Baja recto doblando la rodilla de delante, con el torso vertical, hasta que la rodilla de atrás casi toque el suelo.
Sube empujando con el pie de delante.
Haz todas las repeticiones de una pierna y cambia.'
  ,mistakes = 'Poner el pie de delante demasiado cerca del banco: la rodilla se va muy por delante del pie y la rótula se queda todo el trabajo.
Empujar con el pie de atrás: la pierna de atrás sólo equilibra.
Inclinarse mucho hacia delante: convierte el ejercicio en glúteo. No está mal, pero ya no es cuádriceps.'
where user_id is null and name = 'Sentadilla búlgara';

update public.exercises set
  how_to = 'Siéntate en la prensa con la espalda y la cadera pegadas al respaldo.
Pon los pies en la plataforma a la anchura de los hombros, a media altura.
Suelta los seguros y baja la plataforma doblando las rodillas hasta que queden a unos 90°, o hasta donde la cadera no se despegue del respaldo.
Empuja con todo el pie hasta casi estirar las piernas, sin bloquear las rodillas de golpe.'
  ,mistakes = 'Bajar tanto que la cadera se despegue y la lumbar se redondee contra el respaldo: es la lesión clásica de la prensa. Tu tope es donde la cadera sigue apoyada.
Bloquear las rodillas de golpe arriba con mucho peso.
Poner las manos en las rodillas para empujar.'
where user_id is null and name = 'Prensa de piernas';

update public.exercises set
  how_to = 'Ajusta el respaldo para que la cadera quede en el eje de giro y la almohadilla toque la parte baja de la espinilla, por encima del tobillo.
Siéntate con la espalda apoyada y agarra las asas.
Estira las piernas hasta que queden rectas y aprieta un segundo arriba.
Baja controlando hasta doblar las rodillas del todo.'
  ,mistakes = 'Almohadilla demasiado alta, sobre la espinilla: incomoda y cambia el brazo de palanca.
Lanzar el peso y dejarlo caer: el cuádriceps trabaja igual bajando, y aquí la bajada es fácil de regalar.
Levantar el culo del asiento en las últimas.'
where user_id is null and name = 'Extensión de cuádriceps en máquina';

update public.exercises set
  how_to = 'Colócate en la hack con los hombros bajo las almohadillas y la espalda pegada al respaldo.
Pies a la anchura de los hombros en la plataforma.
Suelta los seguros y baja doblando las rodillas hasta que la cadera pase la rodilla, o hasta donde la espalda siga pegada.
Sube empujando con todo el pie.'
  ,mistakes = 'Separar la espalda del respaldo: la máquina fija la trayectoria, y si tú te mueves, la lumbar compensa.
Poner los pies muy arriba en la plataforma: se convierte en un ejercicio de glúteo e isquio.'
where user_id is null and name = 'Sentadilla hack en máquina';

update public.exercises set
  how_to = 'Ponte de pie y da un paso largo hacia delante.
Baja doblando las dos rodillas hasta que la de atrás casi toque el suelo, con el torso vertical.
Empuja con el pie de delante y trae el pie de atrás hacia delante para dar el siguiente paso.
Sigue caminando alternando piernas.'
  ,mistakes = 'Dar pasos cortos: la rodilla de delante se adelanta demasiado y la rótula aguanta la diferencia.
Empujar hacia arriba en vez de hacia delante al levantarse: da una sacudida a la rodilla.
Cargar mancuernas pesadas antes de controlar el equilibrio sin peso.'
where user_id is null and name = 'Zancadas caminando';

update public.exercises set
  how_to = 'Necesitas un soporte que sujete los tobillos, o engancha los pies bajo algo firme, arrodillado sobre una superficie blanda.
Rodillas apoyadas, tobillos sujetos, cuerpo desde la rodilla a la cabeza en línea recta.
Sin doblar la cadera, echa el cuerpo hacia atrás dejando que las rodillas se abran hacia delante.
Baja hasta donde controles y vuelve apretando el cuádriceps.'
  ,mistakes = 'Doblar la cadera y sentarse hacia atrás: se pierde todo el estiramiento del cuádriceps, que es la razón del ejercicio.
Hacerlo con las rodillas ya sensibles: carga la rótula en un rango muy exigente. Si te molesta, no es tu ejercicio.
Empezar con el rango completo: ve bajando poco a poco a lo largo de semanas.'
where user_id is null and name = 'Sissy squat';

update public.exercises set
  how_to = 'De pie con los pies bastante más abiertos que los hombros y las puntas hacia fuera, sujetando una mancuerna con las dos manos entre las piernas.
Baja llevando la cadera abajo y entre los talones, con el torso vertical y las rodillas siguiendo la línea de las puntas.
Baja hasta notar estiramiento en la cara interna del muslo.
Sube empujando el suelo y apretando glúteo y aductores.'
  ,mistakes = 'Puntas de los pies hacia delante con los pies muy abiertos: la rodilla gira por dentro y el aductor no se estira.
Bajar más de lo que da tu movilidad de cadera: la pelvis se mete por debajo y la lumbar se redondea.'
where user_id is null and name = 'Sentadilla sumo con mancuerna';

update public.exercises set
  how_to = 'De pie con los pies muy abiertos, puntas ligeramente hacia fuera.
Pasa el peso a una pierna y dóblala, bajando la cadera hacia ese lado mientras la otra pierna se estira del todo y la punta del pie se levanta.
Baja hasta abajo, notando el estiramiento en el aductor de la pierna estirada.
Empuja con la pierna flexionada para volver al centro, y cambia de lado.'
  ,mistakes = 'Doblar la pierna que se estira: sin ella recta no hay estiramiento y no queda ejercicio.
Dejar caer el talón de la pierna flexionada: el peso se va a la punta y se pierde el equilibrio.
Añadir peso antes de poder bajar del todo sin peso.'
where user_id is null and name = 'Sentadilla cosaco';

update public.exercises set
  how_to = 'Siéntate en la máquina de aductores con las piernas abiertas y las almohadillas por dentro de los muslos.
Espalda pegada al respaldo.
Cierra las piernas juntando las rodillas y aprieta un segundo.
Abre controlando hasta notar estiramiento, sin dejar que el peso te abra de golpe.'
  ,mistakes = 'Dejar que el peso te abra de golpe: es la posición donde el aductor está más estirado y es donde se produce la lesión de pubis.
Empujar con las manos en las almohadillas.'
where user_id is null and name = 'Aducción de cadera en máquina';

update public.exercises set
  how_to = 'Pon un tobillera en la polea baja y póntela en el tobillo de la pierna que queda más cerca de la torre.
Ponte de lado, sujetándote a la máquina con la mano.
Cruza la pierna por delante de la otra, hacia el lado contrario a la polea.
Vuelve controlando hasta notar estiramiento.'
  ,mistakes = 'Girar la cadera para llegar más lejos: el recorrido lo hace la columna.
Doblar la rodilla: la pierna va estirada, es lo que mantiene la línea de tiro sobre el aductor.'
where user_id is null and name = 'Aducción en polea';
