// ======================================================================
// COPIA DELIBERADA de src/lib/training/progression.ts (de ahí hacia
// abajo, palabra por palabra).
//
// Los Edge Functions son un deployable Deno aparte y no pueden importar
// nada de `src/`, igual que pasa con `_shared/trend.ts` (regla 3 del
// CLAUDE.md). Se duplica en vez de dejar que el modelo improvise su
// propia recomendación porque lo peor que puede pasar aquí es que el
// coach diga "sube a 16 kg" y la pantalla del entreno diga otra cosa:
// una contradicción entre las dos vale menos que no responder.
//
// El razonamiento completo de por qué esto es un algoritmo y no una
// llamada a la IA está en el original. Aquí sólo cambia esta cabecera:
// los tipos que allí se importan de `./types` aquí van escritos a mano.
// `progression.paridad.test.ts` pasa los mismos casos por las dos copias
// y compara el texto desde la primera línea del cuerpo: si divergen,
// falla.
// ======================================================================

type Equipment =
  | "barra"
  | "mancuernas"
  | "polea"
  | "maquina"
  | "peso_corporal"
  | "kettlebell"
  | "banda"
  | "disco"
  | "multipower"
  | "otro";

type SetType = "calentamiento" | "normal" | "dropset" | "backoff" | "fallo";

/** Una serie ya registrada, tal y como sale de `workout_sets`. */
export interface SerieHecha {
  setNumber: number;
  weightKg: number | null;
  reps: number | null;
  /** Repeticiones que dijiste que te quedaban. `null` = no lo anotaste. */
  rir: number | null;
  setType: SetType;
}

/**
 * Lo que se hizo en una serie la última vez, sin el número de serie
 * porque llega indexado por él. Es lo que guarda `SessionExercise.previous`.
 */
export type PreviousSet = Omit<SerieHecha, "setNumber">;

/** Lo que la rutina pauta para ese ejercicio (`routine_exercises`). */
export interface ObjetivoEjercicio {
  sets: number;
  repsMin: number;
  repsMax: number;
  /** Repeticiones en recámara pautadas. `null` = sin pautar. */
  rir: number | null;
}

/**
 * - `sube`: toca más peso (o más repeticiones si no hay peso que subir).
 * - `mantiene`: mismo peso, subiendo repeticiones dentro del rango.
 * - `consolida`: mismo peso pero repartido mejor, porque la sesión
 *   anterior se descompuso a mitad.
 * - `recalibra`: el peso estaba puesto para otro rango y se recalcula
 *   entero desde el máximo estimado, no de poco en poco.
 * - `sin_datos`: primera vez con este ejercicio.
 */
export type Cambio = "sube" | "mantiene" | "consolida" | "recalibra" | "sin_datos";

export interface Recomendacion {
  cambio: Cambio;
  /** Peso sugerido. `null` en peso corporal o sin historial. */
  weightKg: number | null;
  /** Repeticiones a las que apuntar en cada serie. */
  reps: number;
  /** Una línea: la que se enseña grande. */
  titulo: string;
  /** El porqué, con los números de los que sale. Nunca va vacío. */
  detalle: string[];
}

/**
 * Sólo estas series dicen algo del peso que puedes mover.
 *
 * El calentamiento es a propósito flojo, y un dropset se hace ya fundido
 * justo después de otra serie: meterlos en la cuenta haría parecer que
 * rendiste menos de lo que rendiste y bajaría el peso sin motivo.
 */
const SERIES_QUE_CUENTAN: ReadonlySet<SetType> = new Set<SetType>([
  "normal",
  "backoff",
  "fallo",
]);

/**
 * Caída de repeticiones entre la primera serie y la última por encima de
 * la cual se avisa de que la primera se llevó demasiado lejos.
 *
 * El 25% es la convención que se usa en sala para cortar una serie o
 * bajar la carga ("fatigue drop-off"); no es una constante fisiológica,
 * es un punto de corte práctico. Está aquí arriba y con nombre para que
 * se vea que es una elección y no un número mágico escondido, y para que
 * el aviso pueda decir de dónde sale (regla 9).
 */
const CAIDA_EXCESIVA = 0.25;

/**
 * El salto de peso más pequeño que se puede dar de verdad en cada
 * material: no sirve recomendar 15,7 kg si las mancuernas van de dos en
 * dos. El consejo tiene que poder ejecutarse tal cual.
 *
 * `0` significa que no hay peso que subir y se progresa en repeticiones.
 */
export function incrementoMinimo(equipment: Equipment): number {
  switch (equipment) {
    case "barra":
    case "multipower":
      // Un disco de 1,25 kg por lado: el salto más pequeño que permite
      // una barra con discos normales.
      return 2.5;
    case "mancuernas":
      // Las mancuernas de gimnasio suelen ir de dos en dos.
      return 2;
    case "polea":
    case "maquina":
      // La placa habitual. Si la máquina tiene medias placas, el peso se
      // puede poner a mano: esto es la sugerencia, no un tope.
      return 2.5;
    case "kettlebell":
      // Saltan de 4 en 4 kg, que es mucho: en este material conviene
      // progresar en repeticiones bastante más tiempo antes de subir.
      return 4;
    case "disco":
      return 1.25;
    case "banda":
    case "peso_corporal":
    case "otro":
      return 0;
  }
}

/** Redondea al múltiplo del incremento para que el número sea cargable. */
function acargable(kg: number, incremento: number): number {
  if (incremento <= 0) return kg;
  return Math.round(kg / incremento) * incremento;
}

function esTrabajo(s: SerieHecha): boolean {
  return SERIES_QUE_CUENTAN.has(s.setType) && s.reps != null && s.reps > 0;
}

function decimal(n: number): string {
  return n.toLocaleString("es-ES", { maximumFractionDigits: 2 });
}

function nombreMaterial(equipment: Equipment): string {
  switch (equipment) {
    case "mancuernas":
      return "una mancuerna";
    case "barra":
    case "multipower":
      return "la barra";
    case "kettlebell":
      return "una kettlebell";
    default:
      return "este material";
  }
}

/**
 * El trabajo que hizo una sesión: kilos movidos (repeticiones × peso).
 * En peso corporal se cuentan repeticiones, que es lo único que varía.
 */
function trabajoTotal(series: SerieHecha[], sinPeso: boolean): number {
  return series.reduce(
    (total, s) => total + (s.reps ?? 0) * (sinPeso ? 1 : s.weightKg ?? 0),
    0,
  );
}

/**
 * Cuántas repeticiones puede alejarse lo que hiciste del rango que toca
 * antes de que el peso deje de estar "cerca" y haya que recalcularlo
 * entero en vez de moverlo de poco en poco.
 *
 * Tres, el mismo corte que usa `prescripcion.ts` para decidir si merece
 * la pena corregir un rango. Es una elección, no un hallazgo.
 */
const DESVIACION_PARA_RECALIBRAR = 3;

/**
 * Lo máximo que se deja subir un peso de golpe al recalibrar: un 20%.
 *
 * Recalibrar sale de una fórmula, y una fórmula puede equivocarse. Un
 * error del 20% se nota en la primera serie y se corrige; un error del
 * 50% es una lesión. Al bajar no hay tope: menos peso no hace daño.
 */
const SALTO_MAXIMO = 1.2;

/**
 * Máximo estimado con la fórmula de Epley, la misma que usa `records.ts`.
 *
 * `peso × (1 + reps/30)`. Es una estimación y deja de ser fiable por
 * encima de unas 12 repeticiones, así que sólo se usa como punto de
 * partida: la primera serie de hoy dice si estaba bien.
 */
function maximoEstimado(pesoKg: number, reps: number): number {
  return pesoKg * (1 + reps / 30);
}

/** El peso al que, con ese máximo estimado, salen esas repeticiones. */
function pesoParaReps(unaRM: number, reps: number): number {
  return unaRM / (1 + reps / 30);
}

/**
 * Las repeticiones por serie que hacen falta HOY para no hacer menos
 * trabajo que la última vez con el peso que se recomienda.
 *
 * Es la regla que impide que un consejo de progresión te mande hacia
 * atrás. Sin ella, un rango de repeticiones puede hacer daño: si hiciste
 * 13, 10 y 10 con 10 kg (310 kg), decirte "vuelve al suelo del rango, 3
 * de 8" son 240 kg — setenta menos de los que ya moviste. Con el mismo
 * peso, prescribir menos de lo que ya has demostrado no es progresar, es
 * retroceder con buena letra.
 *
 * Sólo aplica cuando el peso NO sube. Al subir peso el trabajo baja a
 * propósito y eso sí es progreso: mueves más carga por repetición.
 */
function repsParaNoRetroceder(
  trabajoAnterior: number,
  sets: number,
  pesoPorRep: number,
): number {
  if (sets <= 0 || pesoPorRep <= 0) return 0;
  return Math.ceil(trabajoAnterior / (sets * pesoPorRep));
}

/** El mapa de "la previa" convertido en la lista que espera el motor. */
export function seriesDesdePrevias(previous: ReadonlyMap<number, PreviousSet>): SerieHecha[] {
  return [...previous.entries()].map(([setNumber, s]) => ({ setNumber, ...s }));
}

/** Un rango prescrito por `prescripcion.ts` para este ejercicio. */
export interface RangoSugerido {
  repsMin: number;
  repsMax: number;
  sets: number;
  rir: number;
}

/** De dónde sale el rango contra el que se juzga la sesión. */
export type FuenteDelRango = "rutina" | "objetivo";

export interface ObjetivoResuelto {
  objetivo: ObjetivoEjercicio;
  fuente: FuenteDelRango;
}

/**
 * Cuánto tienen que separarse dos rangos para que merezca la pena
 * corregir el de la rutina. Ver `SEPARACION_QUE_IMPORTA` en
 * `prescripcion.ts`: por debajo de tres repeticiones, el peso que sale
 * es prácticamente el mismo y cambiarlo sólo sería ruido.
 */
const SEPARACION_QUE_IMPORTA = 3;

/**
 * El objetivo contra el que se juzga la sesión: el de tu rutina, salvo
 * que se aleje de lo que toca para ese ejercicio.
 *
 * ── Por qué no manda siempre la rutina ─────────────────────────────────
 *
 * Antes mandaba, y era un error: el 10-12 de la rutina lo pone alguien
 * que todavía no sabe cuál es el rango bueno, o lo pone al azar. Afinar
 * el peso contra un rango inventado es afinar encima de un error, y así
 * el consejo nunca puede pasar de "repite lo de la otra vez".
 *
 * ── Por qué tampoco manda siempre la prescripción ──────────────────────
 *
 * Porque tu rutina es tuya. Si pone 8-12 y lo que toca es 8-10, pisarla
 * no cambia el peso que sale y sólo consigue que la app te lleve la
 * contraria por nada. Se corrige cuando la diferencia importa de verdad:
 * tres repeticiones en cualquiera de los dos bordes.
 */
export function objetivoDeEjercicio(
  target: ObjetivoEjercicio | null,
  prescrito: RangoSugerido,
  seriesPrevias: number,
): ObjetivoResuelto {
  if (!target) {
    return {
      fuente: "objetivo",
      objetivo: {
        sets: Math.max(prescrito.sets, seriesPrevias),
        repsMin: prescrito.repsMin,
        repsMax: prescrito.repsMax,
        rir: prescrito.rir,
      },
    };
  }

  const lejos =
    Math.abs(target.repsMin - prescrito.repsMin) >= SEPARACION_QUE_IMPORTA ||
    Math.abs(target.repsMax - prescrito.repsMax) >= SEPARACION_QUE_IMPORTA;

  if (!lejos) return { objetivo: target, fuente: "rutina" };

  // Se corrige el rango, pero las series siguen siendo las de tu rutina:
  // cuántas series haces es una decisión de volumen semanal, no de rango.
  return {
    fuente: "objetivo",
    objetivo: {
      sets: target.sets,
      repsMin: prescrito.repsMin,
      repsMax: prescrito.repsMax,
      rir: target.rir ?? prescrito.rir,
    },
  };
}

/**
 * Qué hacer hoy en este ejercicio, a partir de lo que hiciste la última
 * vez que lo entrenaste.
 *
 * `previas` son las series de ESA sesión, no una media de varias: para
 * decidir la carga de hoy importa lo último que sostuviste, no lo que
 * hacías hace un mes.
 */
export function recomendarCarga(
  previas: SerieHecha[],
  objetivo: ObjetivoEjercicio,
  equipment: Equipment,
): Recomendacion {
  const trabajo = [...previas].filter(esTrabajo).sort((a, b) => a.setNumber - b.setNumber);
  const incremento = incrementoMinimo(equipment);
  const sinPeso = incremento === 0;

  // ── Primera vez con este ejercicio ──────────────────────────────────
  if (trabajo.length === 0) {
    return {
      cambio: "sin_datos",
      weightKg: null,
      reps: objetivo.repsMin,
      titulo: "Primera vez: busca tu peso",
      detalle: [
        "No hay ninguna sesión previa de este ejercicio, así que no hay de dónde sacar un peso.",
        `Empieza con uno que puedas mover ${objetivo.repsMin} veces dejando 2 repeticiones en recámara. Si te sobra, súbelo en la siguiente serie.`,
        "Desde el próximo entreno ya te digo el peso exacto y por qué.",
      ],
    };
  }

  const reps = trabajo.map((s) => s.reps ?? 0);
  const pesos = trabajo.map((s) => s.weightKg ?? 0);
  const pesoPrimera = pesos[0];
  const pesoMin = Math.min(...pesos);
  const pesoSugerido = sinPeso ? null : acargable(pesoPrimera, incremento);
  const bajoElPeso = !sinPeso && pesoMin < pesoPrimera;

  const primeras = reps[0];
  const ultimas = reps[reps.length - 1];
  const caida = primeras > 0 ? (primeras - ultimas) / primeras : 0;

  const resumen = trabajo
    .map((s) => `${s.reps}${s.weightKg != null && !sinPeso ? `×${decimal(s.weightKg)} kg` : ""}`)
    .join(", ");
  const laUltimaVez = `La última vez hiciste ${resumen}.`;

  // El suelo de hoy: con el mismo peso, nunca menos trabajo que el otro día.
  const trabajoAnterior = trabajoTotal(trabajo, sinPeso);
  const sinRetroceso = repsParaNoRetroceder(
    trabajoAnterior,
    objetivo.sets,
    sinPeso ? 1 : pesoSugerido ?? 0,
  );

  // El mismo aviso vale en varias ramas: la fatiga se dispara igual
  // bajando el peso que aguantándolo a costa de las repeticiones.
  const avisoDeCaida =
    caida > CAIDA_EXCESIVA && trabajo.length > 1
      ? [
          `Caíste de ${primeras} a ${ultimas} repeticiones (${Math.round(caida * 100)}%). Por encima del ${Math.round(CAIDA_EXCESIVA * 100)}% suele significar que la primera serie se llevó muy cerca del fallo, o que descansaste poco entre series.`,
        ]
      : [];

  // ── El peso no va con el rango: se recalcula entero ─────────────────
  //
  // Si vienes haciendo 10 repeticiones y el rango que toca son 3-6, el
  // peso no está "un poco bajo": está puesto para otra cosa. Moverlo de
  // 2,5 en 2,5 tardaría meses en llegar, y mientras tanto ninguna serie
  // estaría haciendo lo que debería.
  //
  // Pasa en los dos casos que importan: la primera vez que elegiste un
  // peso a ojo, y cuando cambias de objetivo. Se recalcula desde tu
  // máximo estimado, que sale de lo que de verdad levantaste.
  const mejorSerie = trabajo.reduce((a, b) =>
    maximoEstimado(b.weightKg ?? 0, b.reps ?? 0) > maximoEstimado(a.weightKg ?? 0, a.reps ?? 0)
      ? b
      : a,
  );
  const repsMejor = mejorSerie.reps ?? 0;
  const fueraDeRango =
    repsMejor > objetivo.repsMax + DESVIACION_PARA_RECALIBRAR ||
    repsMejor < objetivo.repsMin - DESVIACION_PARA_RECALIBRAR;

  if (!sinPeso && fueraDeRango && (mejorSerie.weightKg ?? 0) > 0) {
    const unaRM = maximoEstimado(mejorSerie.weightKg!, repsMejor);
    // Se apunta al medio del rango, no al borde: el borde de abajo deja
    // el peso alto para las últimas series y el de arriba lo deja corto.
    const objetivoReps = Math.round((objetivo.repsMin + objetivo.repsMax) / 2);
    const teorico = pesoParaReps(unaRM, objetivoReps);
    const nuevo = acargable(Math.min(teorico, pesoPrimera * SALTO_MAXIMO), incremento);
    const sube = nuevo > pesoPrimera;

    return {
      cambio: sube ? "sube" : "recalibra",
      weightKg: nuevo,
      reps: objetivoReps,
      titulo: `${sube ? "Sube" : "Baja"} a ${decimal(nuevo)} kg × ${objetivoReps}`,
      detalle: [
        laUltimaVez,
        `Ese peso está puesto para otro rango: hiciste ${repsMejor} repeticiones y lo que toca aquí son ${objetivo.repsMin}-${objetivo.repsMax}. Moverlo de ${decimal(incremento)} en ${decimal(incremento)} tardaría meses en llegar.`,
        `Con ${repsMejor} repeticiones a ${decimal(mejorSerie.weightKg!)} kg, tu máximo estimado es ${decimal(Math.round(unaRM * 10) / 10)} kg (fórmula de Epley). El peso al que salen ${objetivoReps} repeticiones es ${decimal(nuevo)} kg.`,
        teorico > pesoPrimera * SALTO_MAXIMO
          ? `La cuenta pedía más, pero de un entreno a otro no se sube más de un 20%: un error de cálculo del 20% se nota en la primera serie y se corrige, uno del 50% es una lesión.`
          : `Es una estimación, no una medición. Si la primera serie se te queda corta o larga, cámbialo y el próximo entreno se recalcula con el dato nuevo.`,
      ],
    };
  }

  // ── Bajaste el peso a media sesión ──────────────────────────────────
  //
  // Sostuviste el peso de la primera serie un rato, así que ese peso no
  // es demasiado: lo que sobró fue esfuerzo en la primera. Subirlo sería
  // empeorarlo; bajarlo, tirar un peso con el que sí puedes.
  if (bajoElPeso) {
    const kg = decimal(pesoSugerido!);

    // Sólo las series que hiciste al peso alto dicen qué aguantas con él.
    const alPesoAlto = trabajo.filter((s) => (s.weightKg ?? 0) >= pesoPrimera);
    const repsAlPesoAlto = alPesoAlto.map((s) => s.reps ?? 0);
    const sostenidas = Math.min(...repsAlPesoAlto); // lo que repetiste con él
    const mejor = Math.max(...repsAlPesoAlto); // lo que diste en fresco

    // Tres suelos y un techo. El objetivo es el más exigente de los
    // suelos, pero nunca más de lo que diste en la primera serie: nadie
    // sostiene fatigado más de lo que hizo descansado.
    const objetivoReps = Math.min(
      mejor,
      Math.max(objetivo.repsMin, sostenidas, sinRetroceso),
    );
    const trabajoHoy = objetivoReps * objetivo.sets * (sinPeso ? 1 : pesoSugerido!);

    return {
      cambio: "consolida",
      weightKg: pesoSugerido,
      reps: objetivoReps,
      titulo: `Sostén ${kg} kg × ${objetivoReps} en las ${objetivo.sets} series`,
      detalle: [
        laUltimaVez,
        `Bajaste de ${decimal(pesoPrimera)} a ${decimal(pesoMin)} kg a mitad de sesión, así que el peso no es el problema: aguantaste ${decimal(pesoPrimera)} kg en ${alPesoAlto.length} series.`,
        `Lo que pasó es que la primera se fue demasiado cerca del fallo: ${mejor} y después ${sostenidas} con el mismo peso. Esa diferencia la pagó la última serie.`,
        `Hoy: ${objetivo.sets} × ${objetivoReps} con ${kg} kg. Son ${decimal(trabajoHoy)} ${sinPeso ? "repeticiones" : "kg"} frente a ${decimal(trabajoAnterior)} de la última vez, así que no es repetir lo mismo: es más trabajo y mejor repartido.`,
        `El truco está en la primera serie: párate en ${objetivoReps} aunque te sobren fuerzas. Es justamente lo que hace que la última también llegue a ${objetivoReps}.`,
        `Cuando hagas ${objetivo.repsMax} en las ${objetivo.sets} con ${kg} kg, subes el peso.`,
      ],
    };
  }

  const todasAlTope = reps.every((r) => r >= objetivo.repsMax);
  const seriesSuficientes = trabajo.length >= objetivo.sets;
  const rirCumplido =
    objetivo.rir == null || trabajo.every((s) => s.rir == null || s.rir >= objetivo.rir!);

  // ── Tope del rango en todas las series: toca subir ──────────────────
  if (todasAlTope && seriesSuficientes && rirCumplido) {
    if (sinPeso) {
      return {
        cambio: "sube",
        weightKg: null,
        reps: objetivo.repsMax + 1,
        titulo: `Sube a ${objetivo.repsMax + 1} repeticiones`,
        detalle: [
          laUltimaVez,
          `Llegaste a ${objetivo.repsMax} en las ${trabajo.length} series, que es el tope del rango.`,
          equipment === "peso_corporal"
            ? "En peso corporal no hay peso que subir, así que se progresa añadiendo repeticiones o poniendo el ejercicio más difícil."
            : "Aquí no hay un peso que subir de forma medible, así que se progresa añadiendo repeticiones.",
        ],
      };
    }
    const nuevo = acargable(pesoPrimera + incremento, incremento);
    return {
      cambio: "sube",
      weightKg: nuevo,
      reps: objetivo.repsMin,
      titulo: `Sube a ${decimal(nuevo)} kg`,
      detalle: [
        laUltimaVez,
        `Llegaste a ${objetivo.repsMax} repeticiones (el tope del rango ${objetivo.repsMin}-${objetivo.repsMax}) en las ${trabajo.length} series${objetivo.rir != null ? ` y respetando el RIR ${objetivo.rir} pautado` : ""}.`,
        `Ese es el momento de subir: ${decimal(pesoPrimera)} + ${decimal(incremento)} = ${decimal(nuevo)} kg, el salto más pequeño que permite ${nombreMaterial(equipment)}.`,
        `Vuelves a ${objetivo.repsMin} repeticiones y empiezas a subirlas otra vez desde ahí.`,
      ],
    };
  }

  // ── No llegaste al suelo del rango: el peso no se toca ──────────────
  const pordebajo = reps.filter((r) => r < objetivo.repsMin).length;
  if (pordebajo > 0) {
    // El mínimo del rango es el objetivo, salvo que ya movieras más
    // trabajo del que ese mínimo da: entonces manda lo que ya hiciste.
    const objetivoReps = Math.min(objetivo.repsMax, Math.max(objetivo.repsMin, sinRetroceso));
    return {
      cambio: "mantiene",
      weightKg: pesoSugerido,
      reps: objetivoReps,
      titulo: sinPeso
        ? `Apunta a ${objetivoReps} en las ${objetivo.sets} series`
        : `${decimal(pesoSugerido!)} kg × ${objetivoReps} en las ${objetivo.sets}`,
      detalle: [
        laUltimaVez,
        pordebajo === 1
          ? `1 de ${trabajo.length} series se quedó por debajo de ${objetivo.repsMin}, el mínimo del rango.`
          : `${pordebajo} de ${trabajo.length} series se quedaron por debajo de ${objetivo.repsMin}, el mínimo del rango.`,
        sinPeso
          ? `Lo de ahora es llegar a ${objetivo.repsMin} en las ${objetivo.sets}. El ejercicio no se pone más difícil hasta que las ${objetivo.sets} lleguen a ${objetivo.repsMax}.`
          : `El peso no sube hasta que las ${objetivo.sets} series lleguen a ${objetivo.repsMax}: subirlo ahora sería hacer menos repeticiones de las pautadas.`,
        ...avisoDeCaida,
      ],
    };
  }

  // ── Dentro del rango: mismo peso, una repetición más ────────────────
  const objetivoReps = Math.min(
    objetivo.repsMax,
    Math.max(Math.max(...reps) + 1, sinRetroceso),
  );
  return {
    cambio: "mantiene",
    weightKg: pesoSugerido,
    reps: objetivoReps,
    titulo: sinPeso
      ? `Apunta a ${objetivoReps} repeticiones`
      : `${decimal(pesoSugerido!)} kg × ${objetivoReps}`,
    detalle: [
      laUltimaVez,
      todasAlTope && !seriesSuficientes
        ? `Llegaste a ${objetivo.repsMax} en todas, pero hiciste ${trabajo.length} de las ${objetivo.sets} series pautadas. Antes de subir el peso, completa las ${objetivo.sets}.`
        : `Estás dentro del rango ${objetivo.repsMin}-${objetivo.repsMax} pero sin llegar al tope, así que el peso se queda y suben las repeticiones.`,
      `Hoy apunta a ${objetivoReps} en las ${objetivo.sets} series. Cuando las hagas todas a ${objetivo.repsMax}, subes el peso.`,
      ...avisoDeCaida,
    ],
  };
}
