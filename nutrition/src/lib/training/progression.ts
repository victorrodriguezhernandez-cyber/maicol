import type { Equipment, SetType, TrainingFocus } from "./types";

/**
 * Qué peso y qué repeticiones tocan hoy en cada ejercicio, y por qué.
 *
 * ── Por qué esto es un algoritmo y no una llamada a la IA ──────────────
 *
 * Es la primera pregunta que sale, y la respuesta es que aquí la IA sería
 * peor en las cuatro cosas que importan:
 *
 *   · Justificable. La regla 9 del proyecto exige que cualquier etiqueta
 *     de juicio pueda explicarse con el número exacto del que sale. Esto
 *     devuelve `detalle`: las líneas literales que la justifican. Un
 *     modelo redactaría una explicación convincente que no siempre sería
 *     la razón real de lo que recomendó.
 *   · Instantáneo y gratis. Se puede recalcular en cada serie que
 *     registras, sin esperar y sin gastar cuota. La IA cuesta una
 *     petición por consulta, y de esas hay pocas al día.
 *   · Estable. El mismo historial da SIEMPRE la misma recomendación. Un
 *     modelo puede decir 15 kg hoy y 14 mañana con los mismos datos, y
 *     eso se carga la confianza en el consejo.
 *   · Funciona desde el primer entreno. No necesita memoria ni contexto
 *     acumulado: mira la última sesión de ESE ejercicio.
 *
 * La IA sigue teniendo su sitio encima de esto: resumir cómo ha ido el
 * mes, o responder a un caso raro. Pero cuánto peso poner sale de aquí.
 *
 * ── El método: doble progresión ────────────────────────────────────────
 *
 * Es lo estándar en sala y lo que menos supuestos necesita. Cada
 * ejercicio tiene un RANGO de repeticiones (por ejemplo 8-12):
 *
 *   1. El peso no se toca hasta llegar al TOPE del rango en todas las
 *      series.
 *   2. Cuando se llega, sube el peso lo mínimo que permita el material y
 *      se vuelve al suelo del rango.
 *   3. Si no se llega ni al suelo del rango, el peso se queda donde está.
 *
 * Progresas por dos vías (repeticiones primero, peso después) y nunca
 * subes de peso a costa de hacer menos repeticiones de las pautadas.
 *
 * ── Y el caso de bajar el peso a media sesión ──────────────────────────
 *
 * Hacer 10×14, 8×14 y 8×12 no es un fallo: es información. Dice que la
 * primera serie se llevó demasiado cerca del fallo y la tercera pagó la
 * factura. La recomendación NO es subir ni bajar, es sostener el peso de
 * la primera serie en las tres dejando margen, y subir cuando las tres
 * lleguen al tope del rango. Ver `CAIDA_EXCESIVA`.
 */

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
 * - `sin_datos`: primera vez con este ejercicio.
 */
export type Cambio = "sube" | "mantiene" | "consolida" | "sin_datos";

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

/** El mapa de "la previa" convertido en la lista que espera el motor. */
export function seriesDesdePrevias(previous: ReadonlyMap<number, PreviousSet>): SerieHecha[] {
  return [...previous.entries()].map(([setNumber, s]) => ({ setNumber, ...s }));
}

/**
 * El rango de repeticiones que corresponde a cada objetivo.
 *
 * Es el continuo clásico fuerza → hipertrofia → resistencia de las
 * recomendaciones de la NSCA y el ACSM: cargas altas y series cortas
 * desarrollan sobre todo fuerza, series medias sobre todo tamaño, y
 * series largas sobre todo aguante. Los bordes NO son una frontera real
 * — se gana algo de las tres cosas en todo el espectro — así que esto es
 * dónde apuntar, no una línea que cruzar.
 *
 * `nota` es la explicación que se enseña cuando se usa este rango, para
 * que la recomendación pueda decir de dónde sale (regla 9).
 */
export const RANGO_POR_FOCO: Record<
  TrainingFocus,
  { repsMin: number; repsMax: number; nota: string }
> = {
  fuerza: {
    repsMin: 4,
    repsMax: 6,
    nota: "Tu objetivo es fuerza, así que el rango es corto y pesado (4-6).",
  },
  hipertrofia: {
    repsMin: 8,
    repsMax: 12,
    nota: "Tu objetivo es volumen, así que el rango es el de 8-12.",
  },
  resistencia: {
    repsMin: 15,
    repsMax: 20,
    nota: "Tu objetivo es resistencia, así que el rango es largo (15-20).",
  },
  mantenimiento: {
    repsMin: 8,
    repsMax: 12,
    nota: "Estás manteniendo, así que el rango es el intermedio de 8-12.",
  },
  salud: {
    repsMin: 10,
    repsMax: 15,
    nota: "Entrenas por salud, así que el rango es cómodo (10-15).",
  },
};

/**
 * El objetivo contra el que se juzga la sesión.
 *
 * Manda siempre lo que pauta la rutina: es lo que el usuario tiene
 * delante en su hoja, y aconsejarle contra otro número haría que el
 * consejo no le cuadrara.
 *
 * Sin rutina (una sesión libre) se mira su objetivo personal, pero SÓLO
 * en ejercicios con peso: el continuo fuerza-resistencia va de cuánta
 * carga mueves, y aplicarlo a una plancha o a unos abdominales daría un
 * "haz 4-6" que no tiene sentido. Ahí manda el rango propio del
 * ejercicio, que sí está pensado para él. Sin objetivo guardado, también.
 */
export function objetivoDeEjercicio(
  target: ObjetivoEjercicio | null,
  porDefecto: { repsMin: number; repsMax: number },
  seriesPrevias: number,
  contexto?: { foco?: TrainingFocus | null; equipment?: Equipment },
): ObjetivoEjercicio {
  if (target) return target;

  const conPeso = contexto?.equipment ? incrementoMinimo(contexto.equipment) > 0 : false;
  const rango =
    contexto?.foco && conPeso ? RANGO_POR_FOCO[contexto.foco] : porDefecto;

  return {
    sets: Math.max(3, seriesPrevias),
    repsMin: rango.repsMin,
    repsMax: rango.repsMax,
    rir: null,
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

  // El mismo aviso vale en varias ramas: la fatiga se dispara igual
  // bajando el peso que aguantándolo a costa de las repeticiones.
  const avisoDeCaida =
    caida > CAIDA_EXCESIVA && trabajo.length > 1
      ? [
          `Caíste de ${primeras} a ${ultimas} repeticiones (${Math.round(caida * 100)}%). Por encima del ${Math.round(CAIDA_EXCESIVA * 100)}% suele significar que la primera serie se llevó muy cerca del fallo, o que descansaste poco entre series.`,
        ]
      : [];

  // ── Bajaste el peso a media sesión ──────────────────────────────────
  //
  // Sostuviste el peso de la primera serie un rato, así que ese peso no
  // es demasiado: lo que sobró fue esfuerzo en la primera. Subirlo sería
  // empeorarlo; bajarlo, tirar un peso con el que sí puedes.
  if (bajoElPeso) {
    const kg = decimal(pesoSugerido!);
    return {
      cambio: "consolida",
      weightKg: pesoSugerido,
      reps: objetivo.repsMin,
      titulo: `Sostén ${kg} kg en las ${objetivo.sets} series`,
      detalle: [
        laUltimaVez,
        `Bajaste de ${decimal(pesoPrimera)} a ${decimal(pesoMin)} kg a mitad de sesión, así que el peso no es el problema: aguantaste ${decimal(pesoPrimera)} kg más de una serie.`,
        "Lo que pasó es que la primera serie se fue demasiado cerca del fallo y la última lo pagó.",
        `Hoy: ${objetivo.sets} series de ${objetivo.repsMin} con ${kg} kg, dejando 1-2 repeticiones en recámara en la primera. Cuando las ${objetivo.sets} lleguen a ${objetivo.repsMax}, subes el peso.`,
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
    return {
      cambio: "mantiene",
      weightKg: pesoSugerido,
      reps: objetivo.repsMin,
      titulo: sinPeso
        ? `Repite hasta llegar a ${objetivo.repsMin}`
        : `Repite ${decimal(pesoSugerido!)} kg`,
      detalle: [
        laUltimaVez,
        `${pordebajo} de ${trabajo.length} series se quedaron por debajo de ${objetivo.repsMin}, el mínimo del rango.`,
        `El peso no sube hasta que las ${objetivo.sets} series lleguen a ${objetivo.repsMax}: subirlo ahora sería hacer menos repeticiones de las pautadas.`,
        ...avisoDeCaida,
      ],
    };
  }

  // ── Dentro del rango: mismo peso, una repetición más ────────────────
  const objetivoReps = Math.min(objetivo.repsMax, Math.max(...reps) + 1);
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
