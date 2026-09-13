"use client";

import { useId } from "react";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";

/**
 * Mapa muscular: una figura de frente y otra de espaldas, con cada grupo
 * pintado según cuánto lo has entrenado.
 *
 * ── Por qué está dibujado a mano y no es una imagen ────────────────────
 *
 * 1. Es nuestro. Los renders anatómicos de las apps de gimnasio son obra
 *    con derechos; copiarlos nos metería en un problema el día que esto
 *    salga de tu móvil.
 * 2. Se puede colorear por músculo. Una imagen habría que recortarla en
 *    17 trozos; aquí cada músculo es un `<path>` con su `fill`.
 * 3. Escala sin pixelarse y se adapta al tema solo, porque los colores
 *    salen de las variables CSS igual que el resto de la app.
 *
 * ── Cómo está construido ───────────────────────────────────────────────
 *
 * La figura es simétrica, así que cada músculo par se define UNA vez para
 * el lado izquierdo y se pinta dos veces: la segunda con un espejo sobre
 * el eje central. Escribir los dos lados a mano garantizaría que un día
 * se despisten.
 *
 * Es una figura estilizada, no una lámina de anatomía: las formas son
 * reconocibles y están en su sitio, pero no pretenden ser exactas. Lo que
 * tiene que comunicar es "este músculo está frío y este caliente", y para
 * eso la claridad manda sobre el detalle.
 *
 * La lista de músculos que se pintan aquí tiene que coincidir con
 * `MUSCLE_GROUPS`; hay un test que lo comprueba.
 */

const VIEW_WIDTH = 220;
const VIEW_HEIGHT = 460;
/** Eje de simetría. El espejo es translate(2·CENTER) + scale(-1,1). */
const CENTER = 110;

/**
 * Los tres tonos del mapa, definidos como mezclas sobre el color de texto
 * y no como grises fijos: así el mismo componente funciona en claro y en
 * oscuro sin un solo `@media`.
 *
 * La separación entre los dos primeros es lo que da forma al cuerpo. Con
 * la silueta al mismo tono que la superficie de la tarjeta, la figura
 * desaparecía entera — cabeza incluida — y sólo se veían flotando los
 * músculos encendidos.
 */
const SILHOUETTE_FILL = "color-mix(in srgb, var(--text-primary) 9%, var(--surface))";
const MUSCLE_IDLE_FILL = "color-mix(in srgb, var(--text-primary) 19%, var(--surface))";

export interface BodyMapProps {
  /** Intensidad de 0 a 1 por músculo. Lo que no venga se pinta apagado. */
  intensity: Partial<Record<MuscleGroup, number>>;
  view: "frente" | "espalda";
  onSelect?: (muscle: MuscleGroup) => void;
  selected?: MuscleGroup | null;
  className?: string;
}

/** Músculos visibles de frente, en orden de pintado (de atrás a delante). */
const FRONT_MUSCLES: MuscleGroup[] = [
  "espalda_alta",
  "deltoide_lateral",
  "deltoide_anterior",
  "pecho",
  "oblicuos",
  "abdominales",
  "biceps",
  "antebrazo",
  "aductores",
  "cuadriceps",
  "gemelos",
];

/** Músculos visibles de espaldas. */
const BACK_MUSCLES: MuscleGroup[] = [
  "espalda_alta",
  "dorsal",
  "deltoide_lateral",
  "deltoide_posterior",
  "lumbares",
  "triceps",
  "antebrazo",
  "gluteo",
  "isquiotibiales",
  "gemelos",
];

/**
 * Trazado de cada músculo en cada vista.
 *
 * `mirror: true` significa que el trazado describe el lado izquierdo de
 * la imagen y hay que pintarlo también reflejado. `mirror: false` es para
 * los que cruzan el eje y ya están completos (abdominales, lumbares).
 */
interface MusclePath {
  d: string;
  mirror: boolean;
}

const FRONT_PATHS: Partial<Record<MuscleGroup, MusclePath>> = {
  espalda_alta: {
    // El trapecio superior: de frente se ve como la pendiente que va del
    // cuello al hombro.
    d: "M102,62 C92,63 80,68 71,75 C67,78 66,83 68,86 C75,80 87,76 99,74 C102,73 103,68 102,62 Z",
    mirror: true,
  },
  deltoide_lateral: {
    d: "M72,72 C61,77 54,88 52,102 C51,111 51,120 53,127 C58,125 61,119 63,110 C65,97 68,82 72,72 Z",
    mirror: true,
  },
  deltoide_anterior: {
    d: "M75,71 C70,82 67,94 66,106 C71,106 76,101 80,93 C84,85 85,76 83,70 C80,68 77,69 75,71 Z",
    mirror: true,
  },
  pecho: {
    d: "M106,74 C95,74 86,78 81,85 C76,92 75,101 77,110 C79,119 85,124 94,124 C101,124 106,120 106,111 C107,99 107,85 106,74 Z",
    mirror: true,
  },
  abdominales: {
    // Cruza el eje: es una sola pieza centrada.
    d: "M96,127 C93,142 92,160 92,176 C92,188 95,197 100,202 C105,206 115,206 120,202 C125,197 128,188 128,176 C128,160 127,142 124,127 C115,124 105,124 96,127 Z",
    mirror: false,
  },
  oblicuos: {
    d: "M93,130 C87,139 83,152 81,166 C80,179 82,190 87,197 C90,200 92,197 92,191 C91,176 91,150 93,130 Z",
    mirror: true,
  },
  biceps: {
    d: "M71,108 C62,113 56,126 54,141 C52,154 53,165 57,172 C62,175 66,171 67,162 C68,147 69,125 71,108 Z",
    mirror: true,
  },
  antebrazo: {
    d: "M60,166 C52,177 46,194 45,210 C44,225 46,238 51,247 C56,252 61,248 61,240 C61,227 61,208 62,192 C63,180 61,171 60,166 Z",
    mirror: true,
  },
  cuadriceps: {
    d: "M102,222 C90,221 83,229 80,244 C77,261 78,283 81,302 C83,317 86,328 90,335 C95,339 99,336 100,329 C101,314 102,294 102,272 C103,253 103,235 102,222 Z",
    mirror: true,
  },
  aductores: {
    // Cara interna del muslo, entre el cuádriceps y el eje.
    d: "M110,226 C105,228 103,238 102,251 C101,265 101,278 103,290 C105,297 109,297 110,290 C111,276 111,250 110,226 Z",
    mirror: true,
  },
  gemelos: {
    d: "M92,336 C83,344 77,360 77,378 C77,395 80,410 85,418 C90,423 96,420 97,412 C98,400 98,382 97,366 C96,352 94,342 92,336 Z",
    mirror: true,
  },
};

const BACK_PATHS: Partial<Record<MuscleGroup, MusclePath>> = {
  espalda_alta: {
    // Trapecio entero en una sola pieza, del cuello al borde inferior de
    // la escápula. En dos trozos quedaba una franja negra en medio que
    // parecía un fallo de dibujo, y llegando más abajo se comía el sitio
    // del dorsal, que es quien manda en la mitad baja de la espalda.
    d: "M110,60 C98,60 86,66 77,74 C73,78 72,83 75,87 C81,99 90,110 100,117 C104,120 116,120 120,117 C130,110 139,99 145,87 C148,83 147,78 143,74 C134,66 122,60 110,60 Z",
    mirror: false,
  },
  deltoide_lateral: {
    d: "M72,72 C61,77 54,88 52,102 C51,111 51,120 53,127 C58,125 61,119 63,110 C65,97 68,82 72,72 Z",
    mirror: true,
  },
  deltoide_posterior: {
    d: "M76,74 C72,84 70,96 70,108 C75,108 80,103 83,95 C86,87 86,79 84,73 C81,71 78,72 76,74 Z",
    mirror: true,
  },
  dorsal: {
    // La V: ancho bajo la axila, estrecho en la cintura.
    d: "M80,96 C74,108 72,126 73,144 C74,160 79,174 87,184 C93,191 101,194 106,192 C106,174 106,148 105,124 C104,112 100,101 94,96 C89,92 83,92 80,96 Z",
    mirror: true,
  },
  lumbares: {
    d: "M97,174 C94,184 93,195 94,204 C95,213 100,218 110,218 C120,218 125,213 126,204 C127,195 126,184 123,174 C116,171 104,171 97,174 Z",
    mirror: false,
  },
  triceps: {
    d: "M72,108 C63,113 57,126 55,141 C53,154 54,165 58,172 C63,175 67,171 68,162 C69,147 70,125 72,108 Z",
    mirror: true,
  },
  antebrazo: {
    d: "M60,166 C52,177 46,194 45,210 C44,225 46,238 51,247 C56,252 61,248 61,240 C61,227 61,208 62,192 C63,180 61,171 60,166 Z",
    mirror: true,
  },
  gluteo: {
    d: "M108,216 C95,215 85,220 80,230 C76,239 77,250 83,257 C90,264 100,266 107,262 C110,260 110,250 110,238 C110,226 109,220 108,216 Z",
    mirror: true,
  },
  isquiotibiales: {
    d: "M101,264 C89,264 82,274 80,290 C78,306 79,322 83,334 C86,341 92,340 94,333 C96,320 98,302 100,286 C101,274 102,268 101,264 Z",
    mirror: true,
  },
  gemelos: {
    d: "M92,336 C83,344 77,360 77,378 C77,395 80,410 85,418 C90,423 96,420 97,412 C98,400 98,382 97,366 C96,352 94,342 92,336 Z",
    mirror: true,
  },
};

/**
 * La silueta de debajo.
 *
 * Se pinta sin borde y con las piezas solapadas a propósito: con trazo,
 * cada unión (hombro con brazo, cadera con muslo) dejaba una costura que
 * hacía parecer la figura un maniquí desmontable. Y el orden importa —
 * brazos y piernas van primero, y el tronco encima los tapa por arriba,
 * que es como se ensambla un cuerpo.
 */
function Silhouette({ view }: { view: "frente" | "espalda" }) {
  return (
    <g fill={SILHOUETTE_FILL}>
      {[false, true].map((mirrored) => (
        <g
          key={`extremidad-${mirrored}`}
          transform={mirrored ? `translate(${CENTER * 2},0) scale(-1,1)` : undefined}
        >
          {/* Brazo: húmero, antebrazo y mano, encadenados sin hueco */}
          <path d="M74,70 C62,74 54,86 51,102 C48,120 47,142 48,162 C49,173 55,178 61,175 C66,172 68,165 68,156 C68,138 70,116 74,98 C77,84 78,74 74,70 Z" />
          <path d="M50,158 C44,171 41,188 40,206 C39,222 41,238 46,249 C51,256 59,254 61,247 C63,237 61,220 60,204 C59,188 58,170 58,160 Z" />
          <ellipse cx={51} cy={261} rx={10} ry={13} />
          {/* Pierna: muslo, pantorrilla y pie */}
          <path d="M108,216 C92,214 82,224 78,240 C74,258 74,282 77,304 C79,320 82,332 86,341 C92,346 100,343 101,335 C102,319 104,296 106,272 C108,252 109,230 108,216 Z" />
          <path d="M86,330 C79,341 75,358 75,377 C75,395 78,411 83,421 C88,428 96,426 98,418 C100,407 100,388 99,370 C98,352 95,339 92,330 Z" />
          <path d="M80,418 C77,429 79,438 85,440 L100,440 C104,438 104,429 101,418 Z" />
        </g>
      ))}

      {/* Cuello y tronco, encima de las extremidades */}
      <path d="M101,46 L99,68 L121,68 L119,46 Z" />
      <path d="M110,60 C126,60 141,65 152,74 C162,82 166,96 165,112 C164,130 158,150 154,170 C151,186 150,198 150,212 C150,222 145,228 136,228 L84,228 C75,228 70,222 70,212 C70,198 69,186 66,170 C62,150 56,130 55,112 C54,96 58,82 68,74 C79,65 94,60 110,60 Z" />
      <ellipse cx={CENTER} cy={32} rx={19} ry={23} />

      {view === "espalda" ? (
        // La columna: sin ella, y sin músculos encendidos, la silueta de
        // espaldas y la de frente serían idénticas.
        <line
          x1={CENTER}
          y1={70}
          x2={CENTER}
          y2={215}
          stroke="var(--border-strong)"
          strokeWidth={1.5}
          opacity={0.8}
        />
      ) : null}
    </g>
  );
}

/**
 * Color de un músculo según su intensidad.
 *
 * De la superficie apagada al acento: cuanto más volumen, más azul. No es
 * una escala roja/verde a propósito — rojo y verde ya significan "error"
 * y "correcto" en el resto de la app, y aquí más no es mejor ni peor, es
 * simplemente más.
 */
function muscleFill(intensity: number | undefined, isSelected: boolean): string {
  if (isSelected) return "var(--accent)";
  const t = Math.max(0, Math.min(1, intensity ?? 0));
  if (t === 0) return MUSCLE_IDLE_FILL;
  return `color-mix(in srgb, var(--accent) ${Math.round(18 + t * 72)}%, ${MUSCLE_IDLE_FILL})`;
}

export function BodyMap({
  intensity,
  view,
  onSelect,
  selected = null,
  className,
}: BodyMapProps) {
  const titleId = useId();
  const muscles = view === "frente" ? FRONT_MUSCLES : BACK_MUSCLES;
  const paths = view === "frente" ? FRONT_PATHS : BACK_PATHS;

  return (
    <svg
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      className={className}
      role="img"
      aria-labelledby={titleId}
      style={{ maxWidth: "100%", height: "auto", overflow: "visible" }}
    >
      <title id={titleId}>
        {view === "frente"
          ? "Figura de frente con el volumen de entreno de cada músculo"
          : "Figura de espaldas con el volumen de entreno de cada músculo"}
      </title>

      <Silhouette view={view} />

      {muscles.map((muscle) => {
        const path = paths[muscle];
        if (!path) return null;
        const isSelected = selected === muscle;
        const fill = muscleFill(intensity[muscle], isSelected);
        const label = `${MUSCLE_LABELS[muscle]}${onSelect ? " (toca para ver los ejercicios)" : ""}`;

        const shapes = path.mirror ? [false, true] : [false];
        return (
          <g
            key={muscle}
            onClick={onSelect ? () => onSelect(muscle) : undefined}
            onKeyDown={
              onSelect
                ? (e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onSelect(muscle);
                    }
                  }
                : undefined
            }
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? label : undefined}
            style={{
              cursor: onSelect ? "pointer" : undefined,
              transition: "opacity 160ms ease",
            }}
            className={onSelect ? "body-map-region" : undefined}
          >
            <title>{MUSCLE_LABELS[muscle]}</title>
            {shapes.map((mirrored) => (
              <path
                key={String(mirrored)}
                d={path.d}
                fill={fill}
                stroke={isSelected ? "var(--accent-2)" : SILHOUETTE_FILL}
                strokeWidth={isSelected ? 1.5 : 0.75}
                transform={mirrored ? `translate(${CENTER * 2},0) scale(-1,1)` : undefined}
              />
            ))}
          </g>
        );
      })}
    </svg>
  );
}

/** Los músculos que cada vista puede pintar. Lo usa el test del contrato. */
export const BODY_MAP_COVERAGE = {
  frente: FRONT_MUSCLES,
  espalda: BACK_MUSCLES,
} as const;
