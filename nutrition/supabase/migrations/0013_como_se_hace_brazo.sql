-- Cómo se hace: bíceps, tríceps y antebrazo. Ver 0010.

-- ------------------------------------------------------------- BÍCEPS
update public.exercises set
  how_to = 'De pie con una barra delante, agarre supino (palmas hacia arriba) a la anchura de los hombros.
Brazos estirados, barra en los muslos, codos pegados al torso.
Flexiona los codos subiendo la barra hasta la altura del pecho, sin que los codos se adelanten.
Baja controlando hasta estirar los brazos del todo.'
  ,mistakes = 'Balancear el torso adelante y atrás: el peso lo sube la espalda y el bíceps sólo acompaña. Si te pasa, pégate de espaldas a una pared.
Adelantar los codos al subir: se convierte en medio press y el recorrido del bíceps se acorta.
No estirar el brazo abajo: la parte estirada es donde más crece; media repetición no cuenta como una.'
where user_id is null and name = 'Curl con barra';

update public.exercises set
  how_to = 'De pie con una barra Z (la de zigzag) agarrada por las curvas internas, palmas hacia arriba.
Brazos estirados, codos pegados al torso.
Sube flexionando los codos hasta el pecho.
Baja controlando hasta estirar.'
  ,mistakes = 'Elegir la barra Z sólo por costumbre: su ventaja es que la muñeca queda algo girada y molesta menos el codo. Si la barra recta no te duele, no hay razón para cambiar.
Balancear el torso.'
where user_id is null and name = 'Curl con barra Z';

update public.exercises set
  how_to = 'De pie con una mancuerna en cada mano, brazos estirados a los lados, palmas hacia delante.
Sube una mancuerna flexionando el codo, sin moverlo del costado.
Baja controlando hasta estirar el brazo y sube la otra.'
  ,mistakes = 'Empezar a subir la segunda antes de acabar de bajar la primera: pierdes el control de la bajada, que es la mitad del trabajo.
Girar la muñeca al subir para llegar más arriba: no añade nada al bíceps.
Balancear el cuerpo al ritmo de los brazos.'
where user_id is null and name = 'Curl alterno con mancuernas';

update public.exercises set
  how_to = 'De pie con una mancuerna en cada mano y las palmas enfrentadas, como si llevaras dos martillos.
Brazos estirados, codos al costado.
Sube manteniendo las palmas enfrentadas todo el recorrido, hasta el hombro.
Baja controlando hasta estirar.'
  ,mistakes = 'Girar las palmas al subir: entonces es un curl normal. El agarre neutro es lo que carga el braquial y el antebrazo.
Subir los hombros para ayudarse.'
where user_id is null and name = 'Curl martillo';

update public.exercises set
  how_to = 'Siéntate en un banco inclinado a unos 45°, apoyado en el respaldo, con una mancuerna en cada mano.
Deja los brazos colgar hacia atrás y abajo: el bíceps queda estirado desde el principio, y eso es lo que da esta variante.
Sube flexionando los codos sin adelantarlos.
Baja controlando hasta que el brazo quede colgando del todo.'
  ,mistakes = 'Adelantar los codos al subir: la posición estirada del hombro, que es toda la razón de hacerlo inclinado, se pierde.
Usar el peso del curl de pie: aquí se empieza en desventaja y sale menos. Eso es lo esperado.'
where user_id is null and name = 'Curl inclinado con mancuernas';

update public.exercises set
  how_to = 'Siéntate en un banco y apoya la parte de atrás del brazo en la cara interna del muslo, con una mancuerna en esa mano.
Inclina el torso hacia delante y deja el brazo colgar estirado.
Sube flexionando el codo, sin despegar el brazo del muslo.
Baja controlando hasta estirar del todo.'
  ,mistakes = 'Despegar el brazo del muslo para subir más: el muslo está ahí justo para que no hagas trampa.
Tirar con el hombro en las últimas.'
where user_id is null and name = 'Curl concentrado';

update public.exercises set
  how_to = 'Siéntate en el banco Scott (el del atril inclinado) y apoya toda la parte de atrás de los brazos en la almohadilla.
Agarra la barra con las palmas hacia arriba y estira los brazos.
Sube flexionando los codos hasta que el antebrazo pase la vertical.
Baja controlando hasta estirar, pero sin soltar la tensión de golpe.'
  ,mistakes = 'Soltar el peso de golpe al estirar: es la posición donde el bíceps está más estirado y más vulnerable, y con inercia es donde se rompen las fibras del codo.
Levantar los codos de la almohadilla.'
where user_id is null and name = 'Curl en banco Scott';

update public.exercises set
  how_to = 'Túmbate boca abajo en un banco inclinado con los brazos colgando por el borde de arriba.
Coge una mancuerna en cada mano con las palmas hacia delante, brazos verticales.
Sube flexionando los codos, sin moverlos del sitio.
Baja controlando hasta que los brazos queden verticales otra vez.'
  ,mistakes = 'Mover los codos hacia atrás para ayudarse: en esta posición el brazo tiene que quedarse quieto, es lo que la hace difícil.
Coger peso de curl normal: con el brazo vertical el pico de esfuerzo está arriba y sale bastante menos.'
where user_id is null and name = 'Curl araña';

update public.exercises set
  how_to = 'Pon una barra recta o una barra Z en la polea baja.
De pie a un paso de la torre, agarre supino, brazos estirados.
Sube flexionando los codos hasta el pecho, sin adelantarlos.
Baja controlando; la polea sigue tirando abajo, así que no sueltes la tensión.'
  ,mistakes = 'Ponerse demasiado cerca de la polea: la línea de tiro deja de ser vertical y el principio del recorrido se queda sin resistencia.
Echar el torso atrás.'
where user_id is null and name = 'Curl en polea baja';

update public.exercises set
  how_to = 'Pon una cuerda en la polea baja.
De pie, coge un extremo con cada mano con las palmas enfrentadas.
Brazos estirados, codos al costado.
Sube manteniendo las palmas enfrentadas hasta la altura del pecho.
Baja controlando.'
  ,mistakes = 'Girar las palmas al subir: se pierde el agarre neutro, que es lo que hace martillo a este curl.
Separar los codos del torso.'
where user_id is null and name = 'Curl martillo en polea con cuerda';

-- ------------------------------------------------------------ TRÍCEPS
update public.exercises set
  how_to = 'Pon una barra recta en la polea alta.
De pie a un paso, agarre prono (palmas hacia abajo) a la anchura de los hombros.
Pega los codos al torso y no los muevas de ahí: son el eje del movimiento.
Estira los brazos hacia abajo hasta que queden rectos, y aprieta un segundo.
Deja subir la barra controlando hasta que el antebrazo pase la horizontal.'
  ,mistakes = 'Separar los codos del torso: se convierte en un empuje con pecho y hombro.
Inclinar el torso hacia delante en cada repetición para empujar con el peso del cuerpo: si hace falta, sobra peso.
No estirar del todo: la contracción completa del tríceps es justo con el brazo recto.'
where user_id is null and name = 'Extensión de tríceps en polea alta';

update public.exercises set
  how_to = 'Pon una cuerda en la polea alta y coge un extremo con cada mano, palmas enfrentadas.
Codos pegados al torso, antebrazos hacia arriba.
Estira los brazos hacia abajo y, al final, separa las manos hacia fuera girando las palmas hacia el suelo.
Aprieta un segundo y vuelve controlando.'
  ,mistakes = 'No abrir las manos al final: la cuerda existe justo para poder separarlas y cerrar la contracción; sin eso, usa la barra.
Mover los codos hacia atrás y adelante.'
where user_id is null and name = 'Extensión con cuerda en polea';

update public.exercises set
  how_to = 'Siéntate en un banco con respaldo o ponte de pie, sujetando una mancuerna con las dos manos por detrás de la cabeza.
Codos apuntando al techo y pegados a las orejas.
Estira los brazos hacia arriba hasta que queden rectos.
Baja controlando por detrás de la cabeza hasta notar estiramiento en el tríceps.'
  ,mistakes = 'Abrir los codos hacia los lados: pierdes la línea y el hombro entra a empujar.
Arquear la lumbar al subir: pasa siempre cuando el peso es mayor de lo que el tríceps aguanta en esa posición.
Bajar tan rápido que la mancuerna llegue de golpe: el codo es el que frena, y ahí es donde duele después.'
where user_id is null and name = 'Extensión sobre la cabeza con mancuerna';

update public.exercises set
  how_to = 'Pon una cuerda en la polea baja, o en la alta si vas a darle la espalda.
Dale la espalda a la torre, coge la cuerda por encima de los hombros con los codos al lado de las orejas.
Da un paso adelante con un pie para tener base.
Estira los brazos hacia delante y arriba hasta que queden rectos.
Vuelve controlando hasta notar estiramiento.'
  ,mistakes = 'Dejar que la polea te lleve los codos hacia abajo: el codo se queda arriba, es el eje.
Ponerse demasiado cerca: la mitad del recorrido se queda sin tensión.'
where user_id is null and name = 'Extensión sobre la cabeza en polea';

update public.exercises set
  how_to = 'Túmbate en un banco plano con una barra Z, agarre prono estrecho, brazos estirados sobre el pecho.
Lleva los brazos un poco hacia atrás, para que la línea quede sobre la frente y no sobre los hombros.
Baja la barra doblando los codos hasta la frente o justo por detrás de la cabeza, sin mover los codos de sitio.
Estira los brazos hasta arriba.'
  ,mistakes = 'Mover los codos hacia atrás y adelante: convierte el francés en un pullover y el tríceps descansa.
Bajar la barra hasta la nariz con los brazos verticales: el recorrido se queda corto y el codo aguanta todo el peso.
Coger más peso del que puedes frenar: es el ejercicio con más tendinitis de codo del gimnasio, y casi siempre por eso.'
where user_id is null and name = 'Press francés con barra Z';

update public.exercises set
  how_to = 'Túmbate en un banco plano con una mancuerna en cada mano, brazos estirados sobre el pecho y palmas enfrentadas.
Inclina los brazos un poco hacia atrás.
Baja doblando los codos, llevando las mancuernas a los lados de la cabeza, sin mover los codos.
Estira hasta arriba.'
  ,mistakes = 'Abrir los codos hacia los lados al bajar: cada mancuerna va por su lado y el hombro entra.
Mover los brazos en vez de sólo los antebrazos.'
where user_id is null and name = 'Press francés con mancuernas';

update public.exercises set
  how_to = 'Túmbate en un banco plano con una barra, agarre prono a la anchura de los hombros — no más estrecho.
Junta y hunde los omóplatos y saca la barra.
Baja la barra hasta la parte baja del pecho manteniendo los codos pegados al torso.
Empuja hasta estirar los brazos.'
  ,mistakes = 'Juntar las manos hasta casi tocarse: la muñeca se dobla hacia fuera y el codo se lleva la tensión. A la anchura de los hombros ya es un press cerrado.
Abrir los codos como en banca normal: entonces es banca normal.'
where user_id is null and name = 'Press cerrado con barra';

update public.exercises set
  how_to = 'Súbete a las paralelas con los brazos estirados.
Mantén el torso VERTICAL y los codos pegados al cuerpo: eso es lo que lo hace de tríceps.
Baja hasta que los codos queden a 90°.
Empuja hasta estirar los brazos.'
  ,mistakes = 'Inclinar el torso hacia delante: entonces es un fondo de pecho.
Bajar más de 90° el primer día: el hombro necesita adaptarse a esa posición.
Balancear las piernas.'
where user_id is null and name = 'Fondos en paralelas para tríceps';

update public.exercises set
  how_to = 'Siéntate en el borde de un banco y apoya las manos a los lados de la cadera, dedos hacia delante.
Adelanta el culo hasta quedar suspendido y estira las piernas o déjalas flexionadas.
Baja doblando los codos hacia atrás hasta que queden a 90°, con la espalda pegada al banco.
Empuja hasta estirar los brazos.'
  ,mistakes = 'Alejar el culo del banco: el hombro se abre hacia atrás y es la posición donde más se pinza en este ejercicio.
Bajar hasta el fondo del recorrido: pasado los 90° no hay más tríceps, sólo más tensión en el hombro.
Para hacerlo más fácil, dobla las rodillas; para más difícil, sube los pies a otro banco.'
where user_id is null and name = 'Fondos entre bancos';

update public.exercises set
  how_to = 'Apoya rodilla y mano del mismo lado en un banco, torso paralelo al suelo.
Coge una mancuerna con la mano libre y sube el codo hasta la altura del torso, brazo pegado al costado.
Estira el codo hacia atrás hasta que el brazo quede recto, y aprieta un segundo.
Vuelve controlando hasta 90°, sin bajar el codo.'
  ,mistakes = 'Bajar el codo al volver: se pierde la posición y con ella el ejercicio.
Coger peso: si el codo no puede quedarse quieto, sobra. Aquí se busca la contracción, no la cifra.'
where user_id is null and name = 'Patada de tríceps con mancuerna';

-- ---------------------------------------------------------- ANTEBRAZO
update public.exercises set
  how_to = 'Siéntate en un banco con una barra en las manos, agarre supino, y apoya los antebrazos en los muslos.
Deja que las manos sobresalgan por delante de las rodillas.
Baja las muñecas dejando que la barra ruede hasta las puntas de los dedos.
Vuelve a cerrar y sube las muñecas todo lo que puedas.'
  ,mistakes = 'Mover los antebrazos: sólo se mueve la muñeca, los antebrazos se quedan en los muslos.
Hacer un recorrido de un centímetro con mucho peso: el rango completo incluye dejar rodar la barra a los dedos.'
where user_id is null and name = 'Curl de muñeca con barra';

update public.exercises set
  how_to = 'Siéntate con una barra en las manos, agarre prono (palmas hacia abajo), antebrazos apoyados en los muslos.
Manos por delante de las rodillas, muñecas caídas.
Sube las muñecas hacia arriba todo lo que puedas.
Baja controlando.'
  ,mistakes = 'Cargar como en el curl de muñeca normal: los extensores son mucho más débiles que los flexores. Aquí se usa bastante menos peso.
Ayudarse subiendo los codos.'
where user_id is null and name = 'Curl de muñeca inverso';

update public.exercises set
  how_to = 'De pie con una barra, agarre prono (palmas hacia abajo) a la anchura de los hombros.
Brazos estirados, codos al costado.
Sube flexionando los codos hasta el pecho, manteniendo las palmas hacia abajo todo el recorrido.
Baja controlando hasta estirar.'
  ,mistakes = 'Girar las muñecas al subir: con las palmas hacia arriba vuelve a ser un curl de bíceps y el braquiorradial deja de trabajar.
Usar el peso del curl normal: con el agarre prono sale bastante menos, y eso es normal.'
where user_id is null and name = 'Curl inverso con barra';
