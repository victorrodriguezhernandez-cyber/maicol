-- Cómo se hace: dorsal y espalda alta. Ver la cabecera de 0010.

update public.exercises set
  how_to = 'Agarra la barra con las palmas hacia delante, algo más abiertas que los hombros.
Cuélgate con los brazos estirados del todo y los hombros relajados hacia arriba.
Primero baja los omóplatos, como si te guardaras los hombros en los bolsillos, sin doblar aún los codos. Eso enciende el dorsal.
Tira llevando los codos hacia las costillas hasta que la barbilla pase la barra.
Baja controlando hasta quedar colgado del todo otra vez.'
  ,mistakes = 'Empezar a tirar con los hombros encogidos: el dorsal no llega a entrar y tiran los brazos.
Dar una patada o balancearse para subir: la repetición la hace la inercia. Si no salen, usa goma o la máquina de asistidas.
Parar a medio camino abajo: el recorrido completo de la dominada empieza colgado del todo.'
where user_id is null and name = 'Dominadas pronas';

update public.exercises set
  how_to = 'Agarra la barra con las palmas hacia ti, a la anchura de los hombros.
Cuélgate con los brazos estirados.
Baja los omóplatos y tira llevando los codos hacia abajo y algo hacia delante, con el pecho hacia la barra.
Baja controlando hasta estirar del todo.'
  ,mistakes = 'Tirar sólo con el bíceps: el codo se adelanta y la espalda se queda mirando. Piensa en llevar el pecho a la barra.
Sacar el cuello hacia delante para ganar el último centímetro: no cuenta y carga la cervical.'
where user_id is null and name = 'Dominadas supinas';

update public.exercises set
  how_to = 'Agarra dos asas paralelas con las palmas enfrentadas.
Cuélgate con los brazos estirados.
Baja los omóplatos y tira llevando los codos pegados al torso, hasta que el pecho llegue a la altura de las manos.
Baja controlando hasta estirar.'
  ,mistakes = 'Cargar el hombro haciendo pronas cuando este agarre es el que no te duele: si las pronas te molestan, ésta es la variante, no el premio de consolación.
Balancear las piernas para subir.'
where user_id is null and name = 'Dominadas con agarre neutro';

update public.exercises set
  how_to = 'Ajusta la almohadilla de los muslos para que te sujete sin apretarte.
Agarra la barra ancha con las palmas hacia delante, algo más abiertas que los hombros.
Siéntate con el pecho alto y los brazos estirados arriba.
Tira llevando los codos hacia las costillas hasta que la barra llegue a la parte alta del pecho.
Vuelve controlando hasta estirar los brazos y dejar que los hombros suban.'
  ,mistakes = 'Inclinarse mucho hacia atrás: pasado unos 15° ya es un remo, y con menos dorsal del que crees.
Tirar la barra por detrás del cuello: el hombro se lleva a una posición forzada y no aporta nada.
Tirar con las manos en vez de con los codos: piensa en "bajar los codos", no en "bajar la barra".'
where user_id is null and name = 'Jalón al pecho en polea';

update public.exercises set
  how_to = 'Pon el agarre en V o un agarre supino estrecho en la polea alta.
Siéntate con los muslos sujetos, pecho alto y brazos estirados arriba.
Tira llevando los codos hacia abajo y pegados al torso, hasta el pecho.
Vuelve controlando hasta estirar del todo.'
  ,mistakes = 'Echarse atrás con el torso para tirar más peso: el recorrido cambia y el bíceps se lo queda.
Encoger los hombros al final del recorrido.'
where user_id is null and name = 'Jalón con agarre estrecho';

update public.exercises set
  how_to = 'Pon un agarre de una mano en la polea alta y arrodíllate debajo, o siéntate de lado.
Agarra con una mano y estira el brazo del todo, dejando que el hombro suba hacia la oreja.
Tira bajando primero el omóplato y luego el codo hacia la cadera.
Vuelve dejando que el hombro suba otra vez: ese rango extra es lo que da la versión a una mano.'
  ,mistakes = 'Girar el torso para acompañar el tirón: el recorrido lo hace la columna, no el dorsal.
No dejar subir el hombro al volver: se pierde justo el rango que justifica hacerlo a una mano.'
where user_id is null and name = 'Jalón a una mano en polea';

update public.exercises set
  how_to = 'De pie, pies a la anchura de la cadera, con la barra en el suelo sobre el medio del pie.
Agarra con las palmas hacia ti, algo más abiertas que los hombros.
Flexiona un poco las rodillas y lleva la cadera atrás hasta que el torso quede entre 30° y 45° del suelo. La espalda queda recta, no redondeada.
Fija esa postura: no cambia durante toda la serie.
Tira la barra hacia el ombligo llevando los codos hacia atrás.
Baja controlando hasta estirar los brazos, sin que el torso se levante.'
  ,mistakes = 'Levantar el torso en cada repetición: acabas haciendo un peso muerto a tirones y la lumbar se lleva el trabajo.
Redondear la espalda baja: con peso encima es el gesto que más lesiona en este ejercicio. Si no puedes mantenerla recta, baja el peso.
Tirar al pecho en vez de al ombligo: el codo se abre y el dorsal deja de tirar.'
where user_id is null and name = 'Remo con barra';

update public.exercises set
  how_to = 'Barra en el suelo, pies a la anchura de la cadera.
Lleva la cadera atrás hasta que el torso quede paralelo al suelo, espalda recta.
Agarra con las palmas hacia ti, más abierto que los hombros.
Tira la barra al abdomen en un movimiento explosivo, sin mover el torso.
Devuelve la barra al suelo del todo y para. Cada repetición arranca desde parado.'
  ,mistakes = 'Rebotar la barra en el suelo: la gracia de esta variante es arrancar sin inercia; con rebote es un remo con barra peor hecho.
Subir el torso al tirar: paralelo al suelo significa paralelo también en la última repetición.'
where user_id is null and name = 'Remo Pendlay';

update public.exercises set
  how_to = 'Apoya la rodilla y la mano del mismo lado en un banco.
El otro pie en el suelo, algo atrás. La espalda queda paralela al suelo y recta.
Coge la mancuerna del suelo con el brazo libre y déjalo estirado.
Tira llevando el codo hacia la cadera, pegado al torso, hasta que la mancuerna llegue a la cintura.
Baja controlando hasta estirar el brazo.'
  ,mistakes = 'Girar el torso para subir más peso: la repetición la hace la columna rotando, no la espalda.
Tirar hacia el hombro: el codo se abre y el trabajo se va al deltoides posterior.
Coger tanto peso que el hombro suba de golpe: aquí cuenta más el control que la cifra.'
where user_id is null and name = 'Remo con mancuerna a una mano';

update public.exercises set
  how_to = 'Colócate en la barra T con los pies a los lados y el pecho contra el soporte, si lo tiene.
Agarra las asas y estira los brazos.
Tira llevando los codos hacia atrás hasta que las asas toquen el torso.
Baja controlando hasta estirar del todo.'
  ,mistakes = 'Separar el pecho del soporte para tirar más: el soporte existe justo para que la lumbar no trabaje.
Acortar el recorrido arriba por exceso de peso: si no llegas a tocar, sobra disco.'
where user_id is null and name = 'Remo en barra T';

update public.exercises set
  how_to = 'Ajusta el asiento y el pecho de la máquina para que las asas te queden a la altura del abdomen.
Siéntate con el pecho apoyado y los brazos estirados.
Tira llevando los codos hacia atrás hasta que las manos pasen la línea del torso.
Vuelve controlando hasta estirar.'
  ,mistakes = 'Empujar con las piernas contra el suelo para ayudarse: la máquina está para aislar, si haces trampa no aísla nada.
Dejar que el peso te estire el brazo de golpe al volver.'
where user_id is null and name = 'Remo en máquina';

update public.exercises set
  how_to = 'Pon una barra en el multipower o en unos soportes a la altura de la cadera.
Túmbate debajo y agárrala con las palmas hacia delante, más abierto que los hombros.
Estira el cuerpo en línea recta con los talones apoyados, abdomen y glúteo apretados.
Tira hasta que el pecho toque la barra, llevando los codos hacia atrás.
Baja controlando hasta estirar los brazos.'
  ,mistakes = 'Dejar caer la cadera: la línea se rompe y el tirón se acorta.
Subir la barbilla en vez del pecho: el cuello se estira y el recorrido no llega.
Si es demasiado duro, sube la barra; si es fácil, bájala o pon los pies en un banco. Eso es la progresión aquí.'
where user_id is null and name = 'Remo invertido';

update public.exercises set
  how_to = 'Siéntate en la máquina de polea baja con los pies en los apoyos y las rodillas algo flexionadas.
Coge el agarre y siéntate recto, con el pecho alto y los brazos estirados.
Tira llevando los codos hacia atrás y pegados al torso, hasta el abdomen.
Vuelve controlando y deja que los brazos se estiren y los hombros se adelanten un poco.'
  ,mistakes = 'Balancear el torso adelante y atrás: mueves peso con la cadera, no con la espalda.
Inclinarse hacia atrás pasado la vertical: la lumbar aguanta lo que debería aguantar el dorsal.
Abrir los codos hacia fuera: se convierte en un ejercicio de deltoides posterior.'
where user_id is null and name = 'Remo sentado en polea';

update public.exercises set
  how_to = 'Túmbate a lo ancho de un banco plano, con los omóplatos apoyados y la cadera algo por debajo del banco.
Sujeta una mancuerna con las dos manos por el disco de arriba, brazos casi estirados sobre el pecho.
Lleva la mancuerna por detrás de la cabeza en arco, hasta notar estiramiento en las costillas y el dorsal.
Vuelve por el mismo arco hasta que la mancuerna quede sobre el pecho.'
  ,mistakes = 'Doblar y estirar los codos: se convierte en un press francés y el dorsal no interviene.
Arquear la lumbar para ganar recorrido: el rango extra sale de la columna, no del hombro.
Empezar con mucho peso: en el punto más estirado el hombro está en su posición más vulnerable.'
where user_id is null and name = 'Pullover con mancuerna';

update public.exercises set
  how_to = 'Pon una barra recta en la polea alta y ponte de pie a un paso de la torre.
Agarra la barra con las palmas hacia abajo, brazos casi estirados y codos con una flexión fija.
Inclina un poco el torso hacia delante.
Baja la barra en arco hasta los muslos, sin doblar los codos.
Vuelve controlando hasta que los brazos suban a la altura de la cara.'
  ,mistakes = 'Doblar los codos: pasa a ser una extensión de tríceps.
Ponerse demasiado cerca de la polea: la mitad del arco se queda sin tensión.'
where user_id is null and name = 'Pullover en polea alta';

update public.exercises set
  how_to = 'De pie con una mancuerna en cada mano, brazos estirados a los lados.
Sube los hombros rectos hacia las orejas, todo lo que puedas.
Aguanta un segundo arriba.
Baja controlando hasta dejar que los hombros caigan del todo.'
  ,mistakes = 'Rodar los hombros en círculo: no añade recorrido y lleva el hombro a una posición donde el manguito trabaja de más.
Doblar los codos: se convierte en medio remo y el trapecio hace menos.
Hacer un recorrido de dos centímetros con mucho peso: el trapecio necesita el rango completo, arriba y abajo.'
where user_id is null and name = 'Encogimientos con mancuernas';

update public.exercises set
  how_to = 'De pie con una barra delante, agarre a la anchura de los hombros y palmas hacia ti.
Brazos estirados, barra apoyada en los muslos.
Sube los hombros rectos hacia las orejas y aguanta un segundo.
Baja controlando hasta soltar los hombros del todo.'
  ,mistakes = 'Rodar los hombros.
Ayudarse con un impulso de rodillas en cada repetición: entonces el peso lo mueven las piernas.'
where user_id is null and name = 'Encogimientos con barra';

update public.exercises set
  how_to = 'Pon una barra en la polea baja y agárrala de pie, brazos estirados.
Sube los hombros rectos hacia las orejas.
Aguanta un segundo y baja controlando.'
  ,mistakes = 'Elegir la polea sólo por comodidad y luego hacer medio recorrido: la ventaja de la polea es la tensión constante, aprovéchala con el rango completo.
Doblar los codos.'
where user_id is null and name = 'Encogimientos en polea';

update public.exercises set
  how_to = 'Pon la polea a la altura de la cara con una cuerda.
Agarra los dos extremos con las palmas enfrentadas y da un paso atrás hasta que haya tensión.
Brazos estirados hacia la polea, codos altos.
Tira separando las manos hacia las orejas, con los codos por encima de la línea de los hombros.
Termina con los omóplatos juntos y las manos a los lados de la cabeza.
Vuelve controlando.'
  ,mistakes = 'Tirar con los codos bajos: se convierte en un remo y el trapecio medio se lo queda.
Echar el torso atrás para mover más peso: es un ejercicio de poco peso y mucha posición.'
where user_id is null and name = 'Remo alto con cuerda a la cara';

update public.exercises set
  how_to = 'Túmbate boca abajo en un banco inclinado a unos 30°, con una mancuerna ligera en cada mano.
Deja los brazos colgando hacia el suelo, palmas enfrentadas.
Sube los brazos estirados en diagonal hacia delante y afuera, formando una Y con el cuerpo.
Sube hasta la altura de las orejas y baja controlando.'
  ,mistakes = 'Coger peso: aquí dos o tres kilos ya es mucho, y con más el trapecio superior se lo lleva todo.
Encoger los hombros al subir: lo que se busca es justo lo contrario, el trapecio inferior tirando del omóplato hacia abajo.'
where user_id is null and name = 'Elevaciones en Y en banco inclinado';
