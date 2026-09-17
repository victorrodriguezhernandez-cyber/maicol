// ======================================================================
// COPIA DELIBERADA de src/lib/training/prescripcion.ts (de ahí hacia
// abajo, palabra por palabra). Misma razón y mismas reglas que
// `_shared/progresion.ts`: Deno no puede importar de `src/`, y que el
// coach prescriba un rango distinto del que enseña la pantalla sería
// peor que no prescribir ninguno.
//
// `prescripcion.paridad.test.ts` compara las dos copias carácter a
// carácter desde la primera línea del cuerpo.
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

type Mechanic = "compuesto" | "aislamiento";

type TrainingFocus =
  | "fuerza"
  | "hipertrofia"
  | "resistencia"
  | "mantenimiento"
  | "salud";

type MuscleGroup =
  | "pecho"
  | "dorsal"
  | "espalda_alta"
  | "deltoide_anterior"
  | "deltoide_lateral"
  | "deltoide_posterior"
  | "biceps"
  | "triceps"
  | "antebrazo"
  | "abdominales"
  | "oblicuos"
  | "lumbares"
  | "gluteo"
  | "cuadriceps"
  | "isquiotibiales"
  | "aductores"
  | "gemelos";

/** Hacia dónde va el peso corporal, que sale de `nutrition_goals.mode`. */
export type DireccionPeso = "perder" | "ganar" | "mantener";

/**
 * Cómo se comporta un ejercicio a efectos de carga.
 *
 * No es anatomía, es qué tolera: cuánta carga se le puede meter antes de
 * que el límite deje de ser el músculo y pase a ser la articulación, la
 * técnica o el agarre.
 */
export type ClaseEjercicio =
  | "compuesto_pesado"
  | "compuesto_ligero"
  | "aislamiento_grande"
  | "aislamiento_pequeno";

/**
 * Músculos que mueven mucha carga en un patrón compuesto. El resto no es
 * que sean "poco importantes": es que el peso que aguantan lo limita
 * antes otra cosa (muñeca, codo, hombro, agarre).
 */
const MUSCULOS_GRANDES: ReadonlySet<MuscleGroup> = new Set<MuscleGroup>([
  "pecho",
  "dorsal",
  "espalda_alta",
  "gluteo",
  "cuadriceps",
  "isquiotibiales",
]);

/** Material con el que se puede cargar de verdad y subir de poco en poco. */
const MATERIAL_CARGABLE: ReadonlySet<Equipment> = new Set<Equipment>([
  "barra",
  "multipower",
  "mancuernas",
  "maquina",
  "polea",
  "kettlebell",
  "disco",
]);

export interface EjercicioParaPrescribir {
  mechanic: Mechanic;
  primary_muscle: MuscleGroup;
  equipment: Equipment;
}

export function claseDeEjercicio(e: EjercicioParaPrescribir): ClaseEjercicio {
  const grande = MUSCULOS_GRANDES.has(e.primary_muscle);
  const cargable = MATERIAL_CARGABLE.has(e.equipment);

  if (e.mechanic === "compuesto") {
    // Un compuesto a peso corporal (dominadas, fondos, flexiones) no se
    // puede cargar de dos en dos kilos, así que no se le pide un rango
    // de fuerza: se progresa en repeticiones.
    return grande && cargable ? "compuesto_pesado" : "compuesto_ligero";
  }
  return grande ? "aislamiento_grande" : "aislamiento_pequeno";
}

export interface RangoPrescrito {
  repsMin: number;
  repsMax: number;
  /** Series de trabajo sugeridas para ese ejercicio. */
  sets: number;
  /** Repeticiones en recámara: cuánto margen dejar en cada serie. */
  rir: number;
}

/**
 * La tabla. Cada celda es "dónde apuntar", no una frontera.
 *
 * Se lee: para este objetivo, en un ejercicio de esta clase, este rango.
 * Está entera y a la vista a propósito — es el corazón del consejo y
 * tiene que poder discutirse número a número (regla 9).
 */
export const TABLA_RANGOS: Record<TrainingFocus, Record<ClaseEjercicio, RangoPrescrito>> = {
  // Mover más peso. Series cortas y pesadas en lo que se puede cargar;
  // en lo pequeño se sube el rango porque ahí el límite no es la fuerza.
  fuerza: {
    compuesto_pesado: { repsMin: 3, repsMax: 6, sets: 4, rir: 2 },
    compuesto_ligero: { repsMin: 6, repsMax: 10, sets: 3, rir: 2 },
    aislamiento_grande: { repsMin: 6, repsMax: 10, sets: 3, rir: 2 },
    aislamiento_pequeno: { repsMin: 8, repsMax: 12, sets: 3, rir: 1 },
  },
  // Tamaño. El rango medio no crece más por ser medio: se elige porque
  // acumula series de calidad sin machacar la articulación.
  hipertrofia: {
    compuesto_pesado: { repsMin: 6, repsMax: 10, sets: 4, rir: 1 },
    compuesto_ligero: { repsMin: 8, repsMax: 12, sets: 3, rir: 1 },
    aislamiento_grande: { repsMin: 10, repsMax: 15, sets: 3, rir: 1 },
    aislamiento_pequeno: { repsMin: 12, repsMax: 20, sets: 3, rir: 1 },
  },
  resistencia: {
    compuesto_pesado: { repsMin: 12, repsMax: 15, sets: 3, rir: 1 },
    compuesto_ligero: { repsMin: 15, repsMax: 20, sets: 3, rir: 1 },
    aislamiento_grande: { repsMin: 15, repsMax: 20, sets: 3, rir: 1 },
    aislamiento_pequeno: { repsMin: 15, repsMax: 25, sets: 3, rir: 1 },
  },
  // Conservar. Mismo sitio que hipertrofia pero con más margen: para
  // mantener no hace falta ir al límite, y llegar fresco vale más.
  mantenimiento: {
    compuesto_pesado: { repsMin: 6, repsMax: 10, sets: 3, rir: 2 },
    compuesto_ligero: { repsMin: 8, repsMax: 12, sets: 2, rir: 2 },
    aislamiento_grande: { repsMin: 10, repsMax: 15, sets: 2, rir: 2 },
    aislamiento_pequeno: { repsMin: 12, repsMax: 20, sets: 2, rir: 2 },
  },
  // Moverse y estar bien. Rangos cómodos y lejos del fallo.
  salud: {
    compuesto_pesado: { repsMin: 8, repsMax: 12, sets: 3, rir: 3 },
    compuesto_ligero: { repsMin: 10, repsMax: 15, sets: 2, rir: 3 },
    aislamiento_grande: { repsMin: 10, repsMax: 15, sets: 2, rir: 3 },
    aislamiento_pequeno: { repsMin: 12, repsMax: 20, sets: 2, rir: 3 },
  },
};

const NOMBRE_CLASE: Record<ClaseEjercicio, string> = {
  compuesto_pesado: "un compuesto pesado",
  compuesto_ligero: "un compuesto que no se carga con discos",
  aislamiento_grande: "un aislamiento de un músculo grande",
  aislamiento_pequeno: "un aislamiento de un músculo pequeño",
};

const NOMBRE_FOCO: Record<TrainingFocus, string> = {
  fuerza: "ganar fuerza",
  hipertrofia: "ganar volumen",
  resistencia: "ganar resistencia",
  mantenimiento: "mantener",
  salud: "salud",
};

export interface Prescripcion extends RangoPrescrito {
  clase: ClaseEjercicio;
  /** Por qué ese rango y no otro. Se enseña tal cual. */
  porque: string[];
  /** true si estás en déficit y toca sostener en vez de empujar. */
  enDeficit: boolean;
}

/**
 * El rango que toca hoy en este ejercicio.
 *
 * `direccion` viene de `nutrition_goals.mode` y no es decorado: comiendo
 * por debajo de lo que gastas, la fuerza y el volumen se sostienen mucho
 * peor. Lo correcto entonces NO es empujar más, es conservar la carga y
 * aceptar que muchos entrenos sean iguales al anterior. Por eso en
 * déficit se deja una repetición más en recámara y se quita una serie de
 * los aislamientos: lo que hay que proteger es el peso que mueves, no el
 * número de series.
 */
export function prescribirRango(
  ejercicio: EjercicioParaPrescribir,
  foco: TrainingFocus,
  direccion: DireccionPeso = "mantener",
): Prescripcion {
  const clase = claseDeEjercicio(ejercicio);
  const base = TABLA_RANGOS[foco][clase];
  const enDeficit = direccion === "perder";

  const rir = enDeficit ? base.rir + 1 : base.rir;
  const sets =
    enDeficit && clase.startsWith("aislamiento") ? Math.max(2, base.sets - 1) : base.sets;

  const porque = [
    `Para ${NOMBRE_FOCO[foco]}, en ${NOMBRE_CLASE[clase]}, el sitio donde apuntar es ${base.repsMin}-${base.repsMax} repeticiones.`,
  ];

  if (clase === "aislamiento_pequeno" && (foco === "fuerza" || foco === "hipertrofia")) {
    porque.push(
      "En un músculo pequeño el rango sube a propósito: con un peso para 4 o 5 repeticiones el límite deja de ser el músculo y pasa a ser la articulación o el agarre.",
    );
  }
  if (clase === "compuesto_ligero" && !MATERIAL_CARGABLE.has(ejercicio.equipment)) {
    porque.push(
      "Aquí no se puede subir el peso de poco en poco, así que se progresa en repeticiones y el rango es más largo.",
    );
  }
  if (enDeficit) {
    porque.push(
      `Estás en déficit para bajar grasa. Comiendo por debajo de lo que gastas cuesta mucho más subir, así que el objetivo cambia: sostener el peso que ya mueves ya es ganar. Por eso hoy se deja ${rir} repeticiones en recámara en vez de ${base.rir}${sets !== base.sets ? ` y una serie menos` : ""}. Un entreno igual al anterior, en déficit, es un buen entreno.`,
    );
  }

  return { ...base, rir, sets, clase, porque, enDeficit };
}

/**
 * ¿Merece la pena avisar de que el rango de la rutina no es el que toca?
 *
 * Sólo cuando la diferencia cambia de verdad lo que haces. Que la rutina
 * ponga 8-12 y la prescripción diga 8-10 no da para molestar; que ponga
 * 10-12 en un curl de muñeca cuando lo suyo son 12-20, sí.
 *
 * El umbral son 3 repeticiones de separación en cualquiera de los dos
 * bordes. Es una elección, no un hallazgo: por debajo de ahí el peso que
 * sale es prácticamente el mismo.
 */
export const SEPARACION_QUE_IMPORTA = 3;

export function rangoDesajustado(
  rutina: { repsMin: number; repsMax: number },
  prescrito: { repsMin: number; repsMax: number },
): boolean {
  return (
    Math.abs(rutina.repsMin - prescrito.repsMin) >= SEPARACION_QUE_IMPORTA ||
    Math.abs(rutina.repsMax - prescrito.repsMax) >= SEPARACION_QUE_IMPORTA
  );
}
