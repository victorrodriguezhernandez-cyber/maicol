import {
  MUSCLE_GROUPS,
  VOLUME_LANDMARKS,
  MUSCLE_LABELS,
  type MuscleGroup,
} from "./muscles";

/**
 * Volumen semanal por músculo: cuántas series efectivas ha recibido cada
 * grupo, y si eso está por debajo, dentro o por encima de su rango.
 *
 * Esta es la función que produce la etiqueta que se ve en la app. Todo lo
 * que la app afirma sobre "estás corto de dorsal" sale de aquí, y todo lo
 * que sale de aquí se puede explicar con `explainVolume()` sin que el
 * usuario tenga que creerse nada.
 */

/**
 * Cuánto cuenta una serie para cada músculo que participa.
 *
 * Un músculo primario cuenta 1. Un secundario cuenta 0,5.
 *
 * ¿Por qué 0,5 y no 1 ni 0? Porque las dos alternativas mienten en
 * direcciones opuestas. Contar 0 dice que el tríceps no trabaja en un
 * press de banca, lo cual es falso y hace que la app te mande hacer más
 * tríceps del que necesitas. Contar 1 dice que un press de banca entrena
 * el tríceps tanto como una extensión en polea, lo cual también es falso
 * y hace que la app te frene cuando no toca. 0,5 es la convención
 * habitual al contar "series fraccionarias": reconoce el trabajo sin
 * equipararlo. No es una medida física — es una regla declarada, y por
 * eso está escrita aquí y se enseña en la explicación.
 */
export const SECONDARY_SET_WEIGHT = 0.5;

/**
 * Tipos de serie que NO cuentan para el volumen.
 *
 * Sólo el calentamiento. Una serie de aproximación con la mitad del peso
 * no genera estímulo de crecimiento; contarla infla el número y hace que
 * la app diga "ya vas sobrado" cuando el trabajo real ha sido la mitad.
 * El resto de tipos (dropset, backoff, al fallo) sí son trabajo efectivo.
 */
const NON_COUNTING_SET_TYPES = new Set(["calentamiento"]);

export type VolumeStatus =
  | "sin_trabajo"
  | "por_debajo"
  | "en_rango"
  | "alto"
  | "por_encima";

export interface MuscleVolume {
  muscle: MuscleGroup;
  /** Series efectivas: primarias × 1 + secundarias × 0,5. */
  sets: number;
  /** Sólo las series en las que el músculo era el objetivo. */
  directSets: number;
  /** Sólo las que llegaron como músculo secundario (ya ponderadas). */
  indirectSets: number;
  status: VolumeStatus;
}

/** Una serie completada, con los músculos que el ejercicio declara. */
export interface CountableSet {
  setType: string;
  primaryMuscle: MuscleGroup;
  secondaryMuscles: MuscleGroup[];
}

/**
 * Clasifica un número de series contra el rango del músculo.
 *
 * Los cortes son exactamente los landmarks, sin zonas grises inventadas:
 *
 *   0                      → sin_trabajo
 *   (0, mev)               → por_debajo    "no llega al mínimo"
 *   [mev, mavMax]          → en_rango      "donde quieres estar"
 *   (mavMax, mrv]          → alto          "arriba del rango, vigila"
 *   (mrv, ∞)               → por_encima    "por encima de lo recuperable"
 *
 * Fíjate en que el tramo `mev..mavMin` cae en "en_rango" y no en un
 * cuarto estado. Es deliberado: entre el mínimo efectivo y el inicio del
 * rango óptimo ya estás creciendo, y partir eso en dos etiquetas añadiría
 * un matiz que el usuario no puede accionar.
 */
export function classifyVolume(sets: number, muscle: MuscleGroup): VolumeStatus {
  const l = VOLUME_LANDMARKS[muscle];
  if (sets <= 0) return "sin_trabajo";
  if (sets < l.mev) return "por_debajo";
  if (sets <= l.mavMax) return "en_rango";
  if (sets <= l.mrv) return "alto";
  return "por_encima";
}

/**
 * Suma las series de una semana y las reparte entre los músculos.
 *
 * Devuelve SIEMPRE los 17 músculos, incluidos los que están a cero: un
 * músculo que no aparece es justo el que hay que ver.
 */
export function computeWeeklyVolume(sets: CountableSet[]): MuscleVolume[] {
  const direct = new Map<MuscleGroup, number>();
  const indirect = new Map<MuscleGroup, number>();

  for (const set of sets) {
    if (NON_COUNTING_SET_TYPES.has(set.setType)) continue;

    direct.set(set.primaryMuscle, (direct.get(set.primaryMuscle) ?? 0) + 1);

    // Un ejercicio podría repetir un músculo en secundarios por error de
    // datos; el Set evita contarlo dos veces. Y si el primario aparece
    // también como secundario, no se suma encima de sí mismo.
    for (const sec of new Set(set.secondaryMuscles)) {
      if (sec === set.primaryMuscle) continue;
      indirect.set(sec, (indirect.get(sec) ?? 0) + SECONDARY_SET_WEIGHT);
    }
  }

  return MUSCLE_GROUPS.map((muscle) => {
    const directSets = direct.get(muscle) ?? 0;
    const indirectSets = indirect.get(muscle) ?? 0;
    const total = directSets + indirectSets;
    return {
      muscle,
      sets: total,
      directSets,
      indirectSets,
      status: classifyVolume(total, muscle),
    };
  });
}

export const VOLUME_STATUS_LABELS: Record<VolumeStatus, string> = {
  sin_trabajo: "Sin trabajo",
  por_debajo: "Por debajo del mínimo",
  en_rango: "En rango",
  alto: "Volumen alto",
  por_encima: "Por encima del máximo",
};

/**
 * Color de la etiqueta. Devuelve un nombre de variable CSS, no un hex,
 * para que cambiar el tema siga cambiando esto también.
 *
 * "Alto" es aviso, no error: estar por encima del rango óptimo durante
 * una semana de sobrecarga es una decisión legítima de entrenamiento, no
 * un fallo. Sólo "por encima del máximo" y "por debajo del mínimo" se
 * pintan como problema.
 */
export const VOLUME_STATUS_COLOR: Record<VolumeStatus, string> = {
  sin_trabajo: "var(--text-tertiary)",
  por_debajo: "var(--warning)",
  en_rango: "var(--success)",
  alto: "var(--warning)",
  por_encima: "var(--danger)",
};

/**
 * La explicación completa de una etiqueta, en las palabras del usuario.
 *
 * Existe porque la etiqueta sola ("volumen alto") no es información: es
 * una afirmación sin respaldo. Esto es lo que se abre al tocarla, y es la
 * razón por la que la app puede permitirse enseñar un juicio.
 */
export function explainVolume(v: MuscleVolume): {
  title: string;
  lines: string[];
} {
  const l = VOLUME_LANDMARKS[v.muscle];
  const name = MUSCLE_LABELS[v.muscle];
  const lines: string[] = [];

  lines.push(
    `Esta semana: ${formatSets(v.sets)} series efectivas de ${name.toLowerCase()}` +
      (v.indirectSets > 0
        ? ` (${formatSets(v.directSets)} directas y ${formatSets(v.indirectSets)} que llegan de ejercicios donde es músculo secundario).`
        : "."),
  );

  switch (v.status) {
    case "sin_trabajo":
      lines.push(
        `No has hecho nada de ${name.toLowerCase()} esta semana. El mínimo para que un músculo progrese ronda las ${l.mev} series semanales.`,
      );
      break;
    case "por_debajo":
      lines.push(
        `Está por debajo de ${l.mev} series, que es el mínimo a partir del cual la mayoría de la gente progresa. Con menos se suele mantener, no crecer.`,
      );
      break;
    case "en_rango":
      lines.push(
        `El rango donde suele salir más rentable cada serie va de ${l.mev} a ${l.mavMax} series semanales. Estás dentro.`,
      );
      break;
    case "alto":
      lines.push(
        `Estás por encima de ${l.mavMax} series, que es donde la mayoría deja de ganar por serie añadida. El techo recuperable ronda ${l.mrv}. No es un error — una semana de carga fuerte se ve así — pero mantenerlo semana tras semana suele salir caro.`,
      );
      break;
    case "por_encima":
      lines.push(
        `Estás por encima de ${l.mrv} series, que es lo que la mayoría puede recuperar en una semana. Pasado ese punto la fatiga se acumula más rápido de lo que se repone y el rendimiento baja.`,
      );
      break;
  }

  lines.push(l.note);

  lines.push(
    "Cómo se cuenta: una serie cuenta entera para el músculo objetivo del ejercicio y media para cada músculo secundario. Las series de calentamiento no cuentan.",
  );

  lines.push(
    l.confidence === "alta"
      ? "Estos rangos son medias de población. Tu genética, tu descanso, tus calorías y lo cerca del fallo que entrenes mueven el número: úsalos como referencia, no como norma."
      : "Ojo con este músculo en concreto: recibe mucho trabajo indirecto y hay menos evidencia específica, así que el rango es más orientativo que en el resto.",
  );

  return { title: `${name} · ${VOLUME_STATUS_LABELS[v.status]}`, lines };
}

/** 12 en vez de "12", 7,5 en vez de "7.5". Media serie existe. */
export function formatSets(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/**
 * Intensidad del color en el mapa corporal, de 0 a 1.
 *
 * Se escala contra el techo recuperable (MRV) y no contra el máximo de
 * la semana: así el mapa significa lo mismo una semana floja que una
 * fuerte. Si se normalizara contra el máximo, un músculo con 3 series se
 * pintaría a tope en una semana en la que no hubieras entrenado nada más,
 * que es exactamente la mentira que un mapa de calor no debe contar.
 */
export function volumeIntensity(v: MuscleVolume): number {
  const { mrv } = VOLUME_LANDMARKS[v.muscle];
  if (v.sets <= 0) return 0;
  return Math.min(1, v.sets / mrv);
}
