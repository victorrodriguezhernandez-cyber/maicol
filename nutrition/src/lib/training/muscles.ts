/**
 * Los 17 grupos musculares y sus referencias de volumen semanal.
 *
 * Esta lista es el contrato entre tres sitios: el dominio `muscle_group`
 * de Postgres (migración 0005), el mapa corporal en SVG
 * (`src/components/training/BodyMap.tsx`) y el cálculo de volumen
 * (`volume.ts`). Hay un test que comprueba que los tres coinciden, porque
 * añadir un músculo en uno solo deja un hueco que no da error: el mapa
 * simplemente no pinta nada y nadie se entera.
 */

export const MUSCLE_GROUPS = [
  "pecho",
  "dorsal",
  "espalda_alta",
  "deltoide_anterior",
  "deltoide_lateral",
  "deltoide_posterior",
  "biceps",
  "triceps",
  "antebrazo",
  "abdominales",
  "oblicuos",
  "lumbares",
  "gluteo",
  "cuadriceps",
  "isquiotibiales",
  "aductores",
  "gemelos",
] as const;

export type MuscleGroup = (typeof MUSCLE_GROUPS)[number];

export function isMuscleGroup(value: string): value is MuscleGroup {
  return (MUSCLE_GROUPS as readonly string[]).includes(value);
}

/**
 * Referencias de volumen semanal por músculo, en series efectivas.
 *
 * ── Qué son estos tres números ──────────────────────────────────────────
 *
 *   mev  "volumen mínimo efectivo": por debajo de aquí el estímulo
 *        semanal no suele bastar para crecer; mantiene, poco más.
 *   mav  "volumen máximo adaptativo": el tramo donde la mayoría de la
 *        gente obtiene el mejor retorno por serie. Es un RANGO, no un
 *        número, y por eso la app enseña un rango.
 *   mrv  "volumen máximo recuperable": por encima de aquí la fatiga se
 *        acumula más rápido de lo que se recupera y el rendimiento cae.
 *
 * ── De dónde salen ──────────────────────────────────────────────────────
 *
 * Son los landmarks de volumen que popularizó Renaissance Periodization
 * (Israetel y col.), redondeados y ajustados a los 17 grupos que usa esta
 * app. NO son leyes: son medias de población con muchísima variación
 * individual — genética, nivel, sueño, calorías, cuánto de cerca del fallo
 * entrenas. Alguien puede crecer con 8 series de pecho y otro necesitar
 * 20.
 *
 * ── Por qué están escritas aquí y no ocultas en un componente ──────────
 *
 * Porque la app se compromete a explicar cada etiqueta que enseña. Cuando
 * una tarjeta dice "volumen alto", el usuario puede tocarla y leer el
 * número exacto, el rango con el que se compara y esta misma advertencia.
 * Una etiqueta que no se puede justificar no debería existir.
 *
 * `confidence` dice cuánto fiarse del rango: 'alta' donde hay bastante
 * literatura y consenso, 'media' donde el músculo recibe mucho trabajo
 * indirecto y el conteo aislado es discutible (lumbares, antebrazo,
 * deltoide anterior). Se muestra en la explicación; no se esconde.
 */
export interface VolumeLandmarks {
  mev: number;
  mavMin: number;
  mavMax: number;
  mrv: number;
  confidence: "alta" | "media";
  /** Por qué este músculo tiene estos números y no otros. */
  note: string;
}

export const VOLUME_LANDMARKS: Record<MuscleGroup, VolumeLandmarks> = {
  pecho: {
    mev: 10, mavMin: 12, mavMax: 20, mrv: 22, confidence: "alta",
    note: "Recupera rápido y tolera frecuencia alta. Repartirlo en dos o tres días suele rendir más que meterlo todo en uno.",
  },
  dorsal: {
    mev: 10, mavMin: 14, mavMax: 22, mrv: 25, confidence: "alta",
    note: "Aguanta mucho volumen porque casi todo su trabajo es en rangos de repeticiones medios. Es de los músculos que más se benefician de pasarse de 15 series.",
  },
  espalda_alta: {
    mev: 6, mavMin: 12, mavMax: 20, mrv: 26, confidence: "media",
    note: "Trapecio y romboides reciben mucho trabajo indirecto en cada remo y cada peso muerto, así que el conteo aislado se queda corto respecto a lo que realmente hacen.",
  },
  deltoide_anterior: {
    mev: 4, mavMin: 6, mavMax: 12, mrv: 16, confidence: "media",
    note: "Se lleva trabajo en todos los press, de pecho incluidos. Por eso el mínimo es bajo: añadir elevaciones frontales encima suele sobrar.",
  },
  deltoide_lateral: {
    mev: 8, mavMin: 12, mavMax: 20, mrv: 26, confidence: "alta",
    note: "Casi no recibe trabajo indirecto y recupera muy rápido. Es de los pocos que responde bien a mucho volumen y alta frecuencia.",
  },
  deltoide_posterior: {
    mev: 6, mavMin: 10, mavMax: 18, mrv: 22, confidence: "alta",
    note: "Se queda corto en casi todas las rutinas. Recupera rápido y tolera trabajo casi diario con cargas bajas.",
  },
  biceps: {
    mev: 8, mavMin: 12, mavMax: 20, mrv: 26, confidence: "alta",
    note: "Recibe bastante de los tirones, pero es pequeño y recupera rápido, así que aguanta bien el trabajo directo encima.",
  },
  triceps: {
    mev: 6, mavMin: 10, mavMax: 16, mrv: 20, confidence: "alta",
    note: "Ya trabaja en todos los press. Si haces mucho pecho y hombro, el trabajo directo que necesita baja.",
  },
  antebrazo: {
    mev: 4, mavMin: 8, mavMax: 14, mrv: 20, confidence: "media",
    note: "Trabaja en cada tirón y en cada agarre. Hay poca literatura específica, así que estos números son más orientativos que el resto.",
  },
  abdominales: {
    mev: 6, mavMin: 12, mavMax: 20, mrv: 25, confidence: "alta",
    note: "Tolera mucho volumen y frecuencia alta, pero responde a la carga progresiva igual que cualquier otro músculo: no basta con repetir crunches.",
  },
  oblicuos: {
    mev: 4, mavMin: 8, mavMax: 16, mrv: 20, confidence: "media",
    note: "Trabajan en todo lo que sea anti-rotación y en cualquier cosa que lleves a un lado. El conteo directo se queda corto.",
  },
  lumbares: {
    mev: 2, mavMin: 6, mavMax: 12, mrv: 16, confidence: "media",
    note: "Peso muerto, sentadilla y remo ya la cargan mucho. Por eso el mínimo directo es casi cero: el riesgo aquí es pasarse, no quedarse corto.",
  },
  gluteo: {
    mev: 4, mavMin: 8, mavMax: 16, mrv: 20, confidence: "alta",
    note: "Trabaja en toda sentadilla y todo peso muerto. El trabajo directo (hip thrust, abducción) es el que marca la diferencia por encima del mínimo.",
  },
  cuadriceps: {
    mev: 8, mavMin: 12, mavMax: 18, mrv: 20, confidence: "alta",
    note: "Genera mucha fatiga sistémica: 18 series de cuádriceps cansan más que 18 de bíceps. El techo es real, no teórico.",
  },
  isquiotibiales: {
    mev: 6, mavMin: 10, mavMax: 16, mrv: 20, confidence: "alta",
    note: "Necesita tanto flexión de rodilla (curl femoral) como extensión de cadera (rumano). Sólo una de las dos deja media pierna sin entrenar.",
  },
  aductores: {
    mev: 3, mavMin: 6, mavMax: 12, mrv: 16, confidence: "media",
    note: "Trabaja en cualquier sentadilla profunda y en las zancadas. El trabajo directo es sobre todo prevención de lesión en el pubis.",
  },
  gemelos: {
    mev: 8, mavMin: 12, mavMax: 16, mrv: 20, confidence: "alta",
    note: "Muy resistente a la fatiga y muy dependiente de la genética. Necesita recorrido completo y pausa en el estiramiento más que series extra.",
  },
};

/** Nombre legible, tal y como se enseña en pantalla. */
export const MUSCLE_LABELS: Record<MuscleGroup, string> = {
  pecho: "Pecho",
  dorsal: "Dorsal",
  espalda_alta: "Espalda alta",
  deltoide_anterior: "Hombro anterior",
  deltoide_lateral: "Hombro lateral",
  deltoide_posterior: "Hombro posterior",
  biceps: "Bíceps",
  triceps: "Tríceps",
  antebrazo: "Antebrazo",
  abdominales: "Abdominales",
  oblicuos: "Oblicuos",
  lumbares: "Lumbares",
  gluteo: "Glúteo",
  cuadriceps: "Cuádriceps",
  isquiotibiales: "Isquiotibiales",
  aductores: "Aductores",
  gemelos: "Gemelos",
};

/**
 * Agrupación de alto nivel, para filtros y para ordenar el mapa. No se
 * guarda en base de datos: es sólo presentación.
 */
export const MUSCLE_REGIONS: Record<MuscleGroup, "torso" | "espalda" | "hombro" | "brazo" | "core" | "pierna"> = {
  pecho: "torso",
  dorsal: "espalda",
  espalda_alta: "espalda",
  deltoide_anterior: "hombro",
  deltoide_lateral: "hombro",
  deltoide_posterior: "hombro",
  biceps: "brazo",
  triceps: "brazo",
  antebrazo: "brazo",
  abdominales: "core",
  oblicuos: "core",
  lumbares: "core",
  gluteo: "pierna",
  cuadriceps: "pierna",
  isquiotibiales: "pierna",
  aductores: "pierna",
  gemelos: "pierna",
};

export const REGION_LABELS: Record<(typeof MUSCLE_REGIONS)[MuscleGroup], string> = {
  torso: "Pecho",
  espalda: "Espalda",
  hombro: "Hombro",
  brazo: "Brazo",
  core: "Core",
  pierna: "Pierna",
};
