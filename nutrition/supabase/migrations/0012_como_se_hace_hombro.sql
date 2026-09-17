-- Cómo se hace: hombro (las tres porciones del deltoides). Ver 0010.

update public.exercises set
  how_to = 'Pon la barra en los soportes a la altura de la parte alta del pecho.
Agárrala algo más abierta que los hombros, con las muñecas rectas encima de los codos.
Métete debajo, saca la barra y ponte de pie con ella apoyada en la parte alta del pecho.
Aprieta glúteo y abdomen: son los que impiden que la lumbar se arquee.
Empuja la barra recta hacia arriba. En cuanto pase la frente, mete la cabeza hacia delante para que la barra acabe justo sobre la coronilla.
Baja controlando hasta la clavícula.'
  ,mistakes = 'Arquear la lumbar para empujar: se convierte en un press inclinado de pie y la columna aguanta la diferencia. Si te pasa, baja el peso o hazlo sentado.
Empujar la barra hacia delante en vez de recta: acaba por delante de la cara y el hombro trabaja en desventaja todo el recorrido.
No meter la cabeza: la barra tiene que pasar por delante de la cara, no describir un arco alrededor.'
where user_id is null and name = 'Press militar con barra de pie';

update public.exercises set
  how_to = 'Siéntate en un banco con respaldo casi vertical y la barra en los soportes a la altura del pecho.
Agarra algo más abierto que los hombros y saca la barra.
Espalda apoyada, abdomen apretado.
Empuja recto hacia arriba metiendo la cabeza cuando la barra pase la frente.
Baja controlando hasta la clavícula.'
  ,mistakes = 'Apoyarse tanto en el respaldo que se convierte en un press inclinado: el respaldo es para sujetar la columna, no para empujar desde ahí.
Bajar la barra por detrás del cuello: fuerza la rotación del hombro sin dar más músculo.'
where user_id is null and name = 'Press militar sentado con barra';

update public.exercises set
  how_to = 'Siéntate en un banco con respaldo casi vertical, una mancuerna en cada mano.
Súbelas a la altura de las orejas con las palmas hacia delante y los codos algo por delante del torso, no en línea con la espalda.
Empuja hacia arriba hasta casi estirar, sin chocar las mancuernas.
Baja controlando hasta que los codos queden a la altura de las orejas.'
  ,mistakes = 'Abrir los codos del todo hacia los lados: el hombro queda en la posición donde más se pinza. Un poco por delante es lo cómodo y lo seguro.
Bajar hasta que los codos queden muy por debajo del hombro: no añade músculo y sí tensión en la cápsula.
Arquear la espalda al empujar las últimas.'
where user_id is null and name = 'Press de hombro con mancuernas';

update public.exercises set
  how_to = 'Ajusta el asiento para que las empuñaduras queden a la altura de los hombros.
Siéntate con la espalda pegada al respaldo.
Empuja hacia arriba hasta casi estirar los brazos.
Baja controlando hasta que las manos vuelvan a la altura de los hombros.'
  ,mistakes = 'Asiento demasiado bajo: empiezas con el hombro muy cerrado y el primer tramo del recorrido es el que más molesta.
Bloquear los codos de golpe arriba.'
where user_id is null and name = 'Press de hombro en máquina';

update public.exercises set
  how_to = 'Siéntate con respaldo casi vertical, una mancuerna en cada mano a la altura del pecho y las palmas hacia ti, como al final de un curl.
Gira las manos hacia fuera mientras subes, hasta que las palmas miren hacia delante a media altura.
Sigue empujando hasta arriba.
Baja invirtiendo el giro, hasta volver a tener las palmas hacia ti.'
  ,mistakes = 'Hacer el giro de golpe al final: el giro es parte del movimiento, no un adorno; se reparte por todo el recorrido.
Usar el peso de un press normal: el giro pide menos carga.'
where user_id is null and name = 'Press Arnold';

update public.exercises set
  how_to = 'De pie, una mancuerna en cada mano delante de los muslos, palmas hacia ti.
Sube un brazo estirado hacia delante, con una flexión mínima en el codo.
Para cuando la mano llegue a la altura del hombro.
Baja controlando y cambia de brazo, o hazlo con los dos a la vez.'
  ,mistakes = 'Subir por encima del hombro: por encima de ahí el trabajo pasa al trapecio.
Balancear el torso hacia atrás para dar impulso: si hace falta, sobra peso.
Añadir frontales cuando ya haces mucho press: el deltoides anterior ya trabaja en cada press de pecho y de hombro.'
where user_id is null and name = 'Elevaciones frontales con mancuernas';

update public.exercises set
  how_to = 'De pie, sujeta un disco por los lados con las dos manos, a la altura de los muslos.
Sube los brazos estirados hacia delante hasta la altura de los hombros.
Baja controlando.'
  ,mistakes = 'Subir por encima del hombro.
Arquear la lumbar en las últimas: el disco pesa lo mismo al final que al principio.'
where user_id is null and name = 'Elevaciones frontales con disco';

update public.exercises set
  how_to = 'De pie, una mancuerna en cada mano a los lados, palmas hacia dentro.
Inclina el torso mínimamente hacia delante y flexiona un poco los codos.
Sube los brazos hacia los lados como si vertieras agua de dos jarras, liderando con el codo y no con la mano.
Para cuando los brazos lleguen a la altura de los hombros.
Baja controlando hasta abajo, sin dejar caer.'
  ,mistakes = 'Subir por encima del hombro: a partir de ahí el trapecio se queda el trabajo.
Encoger los hombros al subir: el deltoides lateral deja de tirar casi por completo.
Liderar con la mano en vez del codo: gira el hombro hacia dentro y el recorrido se hace en la posición que más pinza.
Coger demasiado peso y lanzar: es el ejercicio donde más se ve el impulso y menos se nota el músculo.'
where user_id is null and name = 'Elevaciones laterales con mancuernas';

update public.exercises set
  how_to = 'Túmbate de lado en un banco inclinado, apoyado en la cadera y las costillas, con una mancuerna en la mano de arriba.
Deja el brazo colgando por delante del cuerpo.
Sube el brazo hacia el techo, liderando con el codo, hasta la altura del hombro.
Baja controlando hasta abajo del todo.'
  ,mistakes = 'Girar el torso para acompañar: se pierde la ventaja de esta variante, que es tener tensión también en la parte baja del recorrido.
Coger el mismo peso que de pie: aquí no puedes hacer trampa con impulso, así que sale menos.'
where user_id is null and name = 'Elevación lateral inclinado a una mano';

update public.exercises set
  how_to = 'Ajusta el asiento para que el eje de giro de la máquina quede a la altura de los hombros.
Siéntate con la espalda apoyada y los brazos en las almohadillas.
Sube los brazos hacia los lados hasta la altura de los hombros.
Baja controlando.'
  ,mistakes = 'Empujar con las manos en vez de con los brazos: la almohadilla está en el brazo justo para que el codo no haga fuerza.
Subir más de lo que da la máquina echando el torso a un lado.'
where user_id is null and name = 'Elevaciones laterales en máquina';

update public.exercises set
  how_to = 'Pon la polea en el punto más bajo con un agarre de una mano.
Ponte de lado a la torre y coge el agarre con la mano más lejana, cruzando por delante del cuerpo.
Sujétate con la otra mano a la máquina para no balancearte.
Sube el brazo hacia el lado, liderando con el codo, hasta la altura del hombro.
Baja controlando; la polea mantiene tensión también abajo.'
  ,mistakes = 'Coger el agarre con la mano del mismo lado: el recorrido se queda corto y sin tensión al principio.
Balancearse con todo el cuerpo: si no puedes evitarlo, baja el peso.'
where user_id is null and name = 'Elevaciones laterales en polea';

update public.exercises set
  how_to = 'De pie con una barra delante, agarre a la anchura de los hombros o algo más ancho, palmas hacia ti.
Brazos estirados, barra apoyada en los muslos.
Sube la barra pegada al cuerpo llevando los codos hacia arriba y afuera.
Para cuando los codos lleguen a la altura de los hombros, con la barra por el pecho.
Baja controlando.'
  ,mistakes = 'Subir la barra hasta la barbilla con agarre estrecho: ahí el hombro está rotado hacia dentro y elevado del todo, que es la posición de pinzamiento. Para a la altura del hombro y agarra más ancho.
Dar un impulso de rodillas.'
where user_id is null and name = 'Remo al mentón con barra';

update public.exercises set
  how_to = 'De pie con una mancuerna en cada mano, lleva la cadera atrás hasta que el torso quede casi paralelo al suelo, espalda recta.
Deja los brazos colgando con las palmas enfrentadas y los codos algo flexionados.
Abre los brazos hacia los lados hasta la altura de los hombros, liderando con los codos.
Baja controlando sin dejar caer.'
  ,mistakes = 'Levantar el torso al subir los brazos: la espalda entra a tirar y el deltoides posterior sale.
Juntar los omóplatos para subir más: entonces es un remo, y el trapecio hace el trabajo.
Coger peso: con dos kilos bien hechos notas más que con ocho lanzados.'
where user_id is null and name = 'Pájaros con mancuernas';

update public.exercises set
  how_to = 'Túmbate boca abajo en un banco inclinado a 30°, una mancuerna en cada mano colgando hacia el suelo.
Codos algo flexionados, palmas enfrentadas.
Abre los brazos hacia los lados hasta la altura de los hombros.
Baja controlando.'
  ,mistakes = 'Coger demasiado peso: tumbado no puedes compensar con el torso, así que sale menos que de pie y eso es justo lo que se busca.
Juntar los omóplatos en vez de abrir los brazos.'
where user_id is null and name = 'Pájaros en banco inclinado';

update public.exercises set
  how_to = 'Pon las dos poleas a la altura del pecho, sin agarres: se coge el mosquetón o la bola directamente.
Ponte en el centro y coge la polea izquierda con la mano derecha y la derecha con la izquierda, cruzando los brazos.
Da un paso atrás hasta tener tensión, brazos casi estirados.
Abre los brazos hacia atrás y afuera hasta pasar la línea del torso.
Vuelve controlando hasta que los brazos se crucen otra vez.'
  ,mistakes = 'No cruzar los brazos: sin cruce no hay recorrido al principio y falta la mitad del ejercicio.
Doblar y estirar los codos para llegar más lejos.'
where user_id is null and name = 'Pájaros en polea cruzada';

update public.exercises set
  how_to = 'Ajusta el asiento y los brazos de la máquina para que las asas queden a la altura de los hombros y los brazos casi juntos por delante.
Siéntate con el pecho apoyado.
Abre los brazos hacia atrás hasta pasar la línea del torso, liderando con los codos.
Vuelve controlando.'
  ,mistakes = 'Separar el pecho del respaldo para abrir más: el recorrido extra sale de la espalda, no del hombro.
Poner las asas demasiado altas o bajas: si no están a la altura del hombro, el trapecio o el dorsal se quedan el trabajo.'
where user_id is null and name = 'Contractor inverso en máquina';

update public.exercises set
  how_to = 'Pon la polea a la altura de la cara con una cuerda.
Coge los dos extremos con las palmas enfrentadas y da un paso atrás hasta tener tensión.
Brazos estirados hacia delante, a la altura de los ojos.
Tira separando las manos hacia las orejas, con los codos altos y las manos acabando a los lados de la cabeza.
Aprieta un segundo y vuelve controlando.'
  ,mistakes = 'Tirar con los codos por debajo de los hombros: se convierte en un remo alto.
Poner la polea baja: la línea de tiro deja de pasar por el deltoides posterior.
Ir a por peso: es un ejercicio de posición; el peso que puedas tirar con los codos altos es el que toca.'
where user_id is null and name = 'Face pull en polea';
