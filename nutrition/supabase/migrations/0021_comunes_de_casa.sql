-- "Más comunes" también para quien no pisa un gimnasio.
--
-- Los 52 comunes de la 0009 salieron del catálogo que había entonces, que
-- era casi todo de gimnasio: barra, máquina y polea. Con el catálogo de
-- casa ya dentro (0017-0019), el apartado se quedaba corto para alguien
-- que entrena en el salón y abre la app por primera vez — que es
-- exactamente para quien existe "Más comunes".
--
-- Siguen siendo una lista curada y la pantalla lo dice. El criterio no
-- cambia: "lo encuentras en casi cualquier rutina", no "es el mejor".

update public.exercises set is_common = true
where user_id is null and name in (
  'Flexiones con rodillas apoyadas',
  'Flexiones con manos elevadas',
  'Flexiones diamante',
  'Zancada estática',
  'Elevación de talones en escalón',
  'Elevación de piernas tumbado',
  'Crunch bicicleta',
  'Escalador',
  'Burpee',
  'Dominadas negativas',
  'Swing ruso con kettlebell',
  'Remo con pecho apoyado en máquina',
  'Jalón con agarre neutro en polea',
  'Fondos asistidos en máquina',
  'Prensa horizontal de piernas',
  'Aperturas en máquina peck deck',
  'Pull-apart con banda',
  'Hand grip (pinza de mano)'
);
