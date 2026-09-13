import {
  MUSCLE_GROUPS,
  MUSCLE_LABELS,
  VOLUME_LANDMARKS,
  type MuscleGroup,
} from "./muscles";

/**
 * El nivel de cada músculo: lo que decide de qué color se pinta en el mapa
 * corporal.
 *
 * ── Qué problema resuelve ──────────────────────────────────────────────
 *
 * El mapa pintaba el volumen de ESTA semana. Eso servía para saber si ibas
 * corto el jueves, pero no contaba ninguna historia: entrenases seis meses
 * o seis días, una semana floja te dejaba el cuerpo apagado. No había nada
 * que ver crecer.
 *
 * El nivel sí acumula. Un músculo sube de bronce a plata y de plata a oro
 * y se queda ahí; una mala semana no lo borra, pero dejar de entrenarlo
 * meses sí lo baja. Eso es lo que convierte el mapa en un progreso y no en
 * un termómetro.
 *
 * ── Cómo se calcula, y por qué así ─────────────────────────────────────
 *
 * Tres componentes, porque un músculo bien entrenado necesita las tres
 * cosas y ninguna sola basta:
 *
 *   CONSTANCIA (40%)  De las últimas 8 semanas, cuántas llegaron al
 *                     mínimo efectivo de ese músculo. Es lo único que
 *                     depende enteramente de ti y funciona desde la
 *                     primera semana, por eso pesa más.
 *
 *   VOLUMEN (35%)     Series efectivas acumuladas de toda tu historia, en
 *                     escala logarítmica. Logarítmica porque pasar de 20 a
 *                     40 series es un salto enorme y pasar de 400 a 420 no
 *                     es nada; una escala lineal premiaría estancarse
 *                     mucho tiempo igual que progresar.
 *
 *   PROGRESIÓN (25%)  Cuánto ha subido tu mejor marca estimada en el
 *                     ejercicio principal de ese músculo, comparando el
 *                     principio con el final. Mide que además de trabajar,
 *                     estés mejorando.
 *
 * ── La regla honesta ───────────────────────────────────────────────────
 *
 * Un componente sin datos suficientes NO cuenta como cero: se excluye y
 * los pesos se reparten entre los que sí hay. Contarlo como cero
 * castigaría por no tener historial, que es justo lo que le pasa a
 * cualquiera al empezar, y dejaría a todo el mundo en el suelo durante
 * meses.
 *
 * La pantalla dice siempre qué componentes están contando y cuáles están
 * pendientes. Esa es la regla 9 del proyecto: si la app enseña un juicio,
 * tiene que poder defenderlo.
 */

export const TIERS = [
  "sin_datos",
  "bronce",
  "plata",
  "oro",
  "platino",
  "diamante",
] as const;

export type Tier = (typeof TIERS)[number];

/**
 * Los cortes de puntuación de cada rango.
 *
 * No son uniformes a propósito: bronce es ancho porque es donde estás
 * mientras aprendes, y diamante es estrecho porque tiene que costar. Un
 * rango que se alcanza en tres semanas no significa nada.
 */
export const TIER_THRESHOLDS: Record<Exclude<Tier, "sin_datos">, number> = {
  bronce: 1,
  plata: 25,
  oro: 45,
  platino: 65,
  diamante: 85,
};

export const TIER_LABELS: Record<Tier, string> = {
  sin_datos: "Sin datos",
  bronce: "Bronce",
  plata: "Plata",
  oro: "Oro",
  platino: "Platino",
  diamante: "Diamante",
};

/**
 * El color de cada rango — y por tanto el relleno de cada músculo.
 *
 * Cinco tonos claramente distintos, en el orden que todo el mundo ya
 * reconoce (cobre → gris → dorado → turquesa → violeta). Ninguno es el
 * azul del tema: ese sigue reservado para lo que se toca, así que el mapa
 * nunca se confunde con un botón.
 *
 * Son valores fijos y no variables de tema porque un rango tiene que ser
 * el mismo color en claro y en oscuro: si el oro cambia de tono según la
 * hora del día, deja de ser un rango.
 */
export const TIER_COLORS: Record<Tier, string> = {
  sin_datos: "#eef1f6",
  bronce: "#c17a3e",
  plata: "#9aa6b8",
  oro: "#e9b02c",
  platino: "#4fd1c5",
  diamante: "#a78bfa",
};

/** Un tono más oscuro del mismo color, para el borde del músculo. */
export const TIER_EDGE: Record<Tier, string> = {
  sin_datos: "#3a3a47",
  bronce: "#8a5528",
  plata: "#7f8896",
  oro: "#a87c15",
  platino: "#2b9b92",
  diamante: "#7a5fd0",
};

export const TIER_DESCRIPTIONS: Record<Tier, string> = {
  sin_datos: "Todavía no has entrenado este músculo.",
  bronce: "Has empezado. Lo que cuenta ahora es repetir semanas, no levantar más.",
  plata: "Ya hay constancia. El músculo recibe trabajo de forma regular.",
  oro: "Bien entrenado y progresando. Este es el nivel que sostiene un físico.",
  platino: "Mucho volumen acumulado y progresión clara. Pocos llegan aquí sin años.",
  diamante: "Constancia casi perfecta, volumen alto y mejora sostenida.",
};

// =========================================================================

/** Lo que hace falta saber de un músculo para puntuarlo. */
export interface MuscleStats {
  muscle: MuscleGroup;
  /** Semanas (de las últimas 8) en las que llegó a su mínimo efectivo. */
  weeksAtMev: number;
  /** Cuántas semanas de historial hay realmente. Máximo 8. */
  weeksObserved: number;
  /** Series efectivas acumuladas en toda la historia. */
  totalSets: number;
  /**
   * Mejora en el ejercicio principal de ese músculo, en tanto por uno.
   * `null` si no hay suficientes sesiones para medirla.
   */
  strengthGain: number | null;
  /** Sesiones del ejercicio principal, para explicar qué falta. */
  sessionsOnMainLift: number;
}

export interface MuscleLevel {
  muscle: MuscleGroup;
  tier: Tier;
  /** 0-100. */
  score: number;
  /** Puntuación de cada componente sobre 100, o null si no hay datos. */
  parts: {
    constancia: number | null;
    volumen: number | null;
    progresion: number | null;
  };
  /** Cuánto falta para el siguiente rango, o null si ya es el máximo. */
  next: { tier: Tier; pointsAway: number } | null;
}

const WEIGHTS = { constancia: 0.4, volumen: 0.35, progresion: 0.25 };

/**
 * Series acumuladas que dan el máximo del componente de volumen.
 *
 * 400 series efectivas de un músculo son, a 12 series por semana, unos 8
 * meses de trabajo constante. Es un techo alcanzable pero que cuesta, que
 * es lo que tiene que ser.
 */
const VOLUME_CEILING_SETS = 400;

/**
 * Mejora de fuerza que da el máximo del componente de progresión.
 *
 * Subir un 50% la marca estimada es una progresión grande — lo normal de
 * un primer año entrenando en serio. Por encima de eso no se puntúa más:
 * el que ya es fuerte progresa más despacio y no debe ser castigado.
 */
const STRENGTH_GAIN_CEILING = 0.5;

/** Sesiones mínimas del ejercicio principal para medir progresión. */
export const MIN_SESSIONS_FOR_PROGRESSION = 4;

export function computeMuscleLevel(stats: MuscleStats): MuscleLevel {
  const parts: MuscleLevel["parts"] = {
    constancia: null,
    volumen: null,
    progresion: null,
  };

  // CONSTANCIA — sobre las semanas realmente observadas, no sobre 8. Si
  // llevas dos semanas y las dos las has cumplido, tu constancia es del
  // 100%, no del 25%. Premiar el historial largo ya es trabajo del
  // componente de volumen; duplicarlo aquí castigaría dos veces por lo
  // mismo.
  if (stats.weeksObserved > 0) {
    parts.constancia = clamp01(stats.weeksAtMev / stats.weeksObserved) * 100;
  }

  // VOLUMEN — logarítmico.
  if (stats.totalSets > 0) {
    parts.volumen =
      clamp01(
        Math.log10(1 + stats.totalSets) / Math.log10(1 + VOLUME_CEILING_SETS),
      ) * 100;
  }

  // PROGRESIÓN — sólo con sesiones suficientes. Una bajada puntúa 0, no
  // negativo: una mala racha no debería borrar el trabajo hecho.
  if (stats.strengthGain != null && stats.sessionsOnMainLift >= MIN_SESSIONS_FOR_PROGRESSION) {
    parts.progresion = clamp01(stats.strengthGain / STRENGTH_GAIN_CEILING) * 100;
  }

  // Media ponderada, renormalizando sobre lo que sí tiene datos.
  let suma = 0;
  let pesoTotal = 0;
  for (const clave of ["constancia", "volumen", "progresion"] as const) {
    const valor = parts[clave];
    if (valor == null) continue;
    suma += valor * WEIGHTS[clave];
    pesoTotal += WEIGHTS[clave];
  }

  const score = pesoTotal === 0 ? 0 : suma / pesoTotal;
  const tier = tierForScore(stats.totalSets === 0 ? 0 : score);

  return { muscle: stats.muscle, tier, score, parts, next: nextTier(tier, score) };
}

export function tierForScore(score: number): Tier {
  if (score <= 0) return "sin_datos";
  if (score >= TIER_THRESHOLDS.diamante) return "diamante";
  if (score >= TIER_THRESHOLDS.platino) return "platino";
  if (score >= TIER_THRESHOLDS.oro) return "oro";
  if (score >= TIER_THRESHOLDS.plata) return "plata";
  return "bronce";
}

function nextTier(tier: Tier, score: number): MuscleLevel["next"] {
  const orden: Tier[] = ["sin_datos", "bronce", "plata", "oro", "platino", "diamante"];
  const i = orden.indexOf(tier);
  if (i >= orden.length - 1) return null;
  const siguiente = orden[i + 1] as Exclude<Tier, "sin_datos">;
  return {
    tier: siguiente,
    pointsAway: Math.max(0, Math.ceil(TIER_THRESHOLDS[siguiente] - score)),
  };
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(1, n));
}

// =========================================================================

/**
 * La explicación completa de un nivel, en las palabras del usuario.
 *
 * Es lo que se abre al tocar un músculo del mapa. Tiene que responder a
 * "¿por qué este color?" sin que haya que creerse nada, y a "¿qué hago
 * para subir?" con algo accionable.
 */
export function explainLevel(
  level: MuscleLevel,
  stats: MuscleStats,
): { title: string; lines: string[]; todo: string[] } {
  const nombre = MUSCLE_LABELS[level.muscle];
  const landmarks = VOLUME_LANDMARKS[level.muscle];
  const lines: string[] = [];
  const todo: string[] = [];

  lines.push(TIER_DESCRIPTIONS[level.tier]);

  if (stats.totalSets === 0) {
    todo.push(
      `Haz ${landmarks.mev} series de ${nombre.toLowerCase()} en una semana para salir de aquí.`,
    );
    return { title: `${nombre} · ${TIER_LABELS[level.tier]}`, lines, todo };
  }

  lines.push(
    `Puntuación: ${Math.round(level.score)} sobre 100. Se calcula con tres cosas, y cada una cuenta lo que cuenta:`,
  );

  if (level.parts.constancia != null) {
    lines.push(
      `· Constancia (40%): ${stats.weeksAtMev} de las últimas ${stats.weeksObserved} semanas llegaste a las ${landmarks.mev} series mínimas. → ${Math.round(level.parts.constancia)}/100`,
    );
    if (level.parts.constancia < 85) {
      todo.push(
        `Cumple el mínimo de ${landmarks.mev} series semanales de forma seguida: es lo que más puntúa y lo único que depende sólo de ti.`,
      );
    }
  }

  if (level.parts.volumen != null) {
    lines.push(
      `· Volumen acumulado (35%): ${formatNumber(stats.totalSets)} series efectivas en total. La escala es logarítmica, así que al principio se sube rápido y luego cuesta. → ${Math.round(level.parts.volumen)}/100`,
    );
  }

  if (level.parts.progresion != null) {
    const pct = Math.round((stats.strengthGain ?? 0) * 100);
    lines.push(
      `· Progresión (25%): tu marca estimada en el ejercicio principal ha ${pct >= 0 ? "subido" : "bajado"} un ${Math.abs(pct)}%. → ${Math.round(level.parts.progresion)}/100`,
    );
    if (level.parts.progresion < 60) {
      todo.push(
        "Sube peso o repeticiones respecto a la sesión anterior. El volumen sin progresión estanca.",
      );
    }
  } else {
    lines.push(
      `· Progresión (25%): pendiente. Hacen falta ${MIN_SESSIONS_FOR_PROGRESSION} sesiones del mismo ejercicio para medirla, y llevas ${stats.sessionsOnMainLift}. Mientras tanto no cuenta ni a favor ni en contra — no se puntúa como un cero, porque eso castigaría por acabar de empezar.`,
    );
    todo.push(
      `Repite el mismo ejercicio principal ${Math.max(1, MIN_SESSIONS_FOR_PROGRESSION - stats.sessionsOnMainLift)} ${MIN_SESSIONS_FOR_PROGRESSION - stats.sessionsOnMainLift === 1 ? "vez más" : "veces más"} para poder medir si estás progresando.`,
    );
  }

  if (level.next) {
    lines.push(
      `Te faltan ${level.next.pointsAway} puntos para ${TIER_LABELS[level.next.tier]}.`,
    );
  } else {
    lines.push("Es el rango más alto. Mantenerlo ya es el objetivo.");
  }

  return { title: `${nombre} · ${TIER_LABELS[level.tier]}`, lines, todo };
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1).replace(".", ",");
}

/**
 * El resumen de todo el cuerpo: cuántos músculos hay en cada rango.
 * Es lo que permite enseñar "3 en oro, 8 en bronce" de un vistazo.
 */
export function summarizeLevels(levels: MuscleLevel[]): Record<Tier, number> {
  const resumen = Object.fromEntries(TIERS.map((t) => [t, 0])) as Record<Tier, number>;
  for (const l of levels) resumen[l.tier] += 1;
  return resumen;
}

/**
 * El nivel global: la media de los 17 músculos.
 *
 * Los que están a cero cuentan. Un físico no es la media de lo que
 * entrenas — es la media de todo tu cuerpo, y tener nueve músculos en
 * diamante y ocho sin tocar no es estar en diamante.
 */
export function overallLevel(levels: MuscleLevel[]): { tier: Tier; score: number } {
  if (levels.length === 0) return { tier: "sin_datos", score: 0 };
  const media = levels.reduce((s, l) => s + l.score, 0) / MUSCLE_GROUPS.length;
  return { tier: tierForScore(media), score: media };
}
