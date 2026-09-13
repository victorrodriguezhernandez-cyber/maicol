"use client";

import { useId } from "react";
import { TIER_COLORS, TIER_EDGE, type Tier } from "@/lib/training/levels";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";

/**
 * La figura: una lámina anatómica real, con el rango de cada músculo
 * pintado encima.
 *
 * ── Por qué una imagen y no un dibujo en SVG ───────────────────────────
 *
 * Esto estuvo dibujado a mano en trazados SVG durante varias versiones y
 * nunca llegó a parecer una persona: un cuerpo con volumen necesita
 * sombreado continuo, y un trazado plano no lo tiene. La lámina la aporta
 * el usuario, así que no hay problema de licencia, y el SVG se queda con
 * lo que sí sabe hacer: las zonas interactivas y el color.
 *
 * ── Cómo entra el color sin tapar el músculo ───────────────────────────
 *
 * El color NO se pinta opaco encima (eso taparía el relieve y dejaría una
 * mancha plana). Se mezcla en modo `screen`, que aclara: el relleno oscuro
 * del músculo se tiñe y se ilumina, y las líneas blancas que lo dibujan se
 * quedan blancas. Es exactamente lo que hacía la lámina original con el
 * pectoral resaltado.
 *
 * `screen` sobre negro da el color puro, así que sin recortar el color se
 * escaparía al fondo. Por eso todo el grupo va enmascarado con la silueta
 * del cuerpo (`cuerpo-silueta.png`, sacada del propio dibujo inundando el
 * fondo desde los bordes).
 *
 * Un músculo sin datos no se pinta: se queda con el gris de la lámina. Es
 * deliberado — "todavía no sé nada de esto" se lee mejor como ausencia de
 * color que como un color más que memorizar.
 */

/** Tamaño de la lámina en píxeles; es el sistema de coordenadas de todo. */
const LAMINA_W = 1144;
const LAMINA_H = 1013;

/** Centro de cada figura dentro de la lámina, para poder reflejar. */
const CENTRO = { frente: 283, espalda: 880 } as const;
/** Recorte de cada vista: la lámina trae las dos, una al lado de la otra. */
const RECORTE = {
  frente: { x: 30, w: 506 },
  espalda: { x: 620, w: 506 },
} as const;

export interface BodyMapProps {
  /** Rango de cada músculo. Lo que no venga se queda sin color. */
  tiers: Partial<Record<MuscleGroup, Tier>>;
  onSelect?: (muscle: MuscleGroup) => void;
  selected?: MuscleGroup | null;
  className?: string;
  /** Sólo una de las dos vistas, para sitios estrechos. */
  only?: "frente" | "espalda";
}

/**
 * Una zona muscular: uno o más óvalos sobre la lámina.
 *
 * Óvalos y no contornos exactos a propósito. El relieve, la separación y
 * la forma ya los pone la lámina; esto sólo dice DÓNDE va el color, y al
 * difuminarse entra y sale sin que se vea el borde de la mancha. Un
 * contorno recortado al milímetro se notaría más, no menos.
 */
interface Ovalo {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  /** Grados; el eje largo de casi ningún músculo es vertical puro. */
  rot?: number;
}

interface Zona {
  ovalos: Ovalo[];
  /** true = está descrito en un lado y el otro es su espejo. */
  espejo?: boolean;
}

const FRENTE: Partial<Record<MuscleGroup, Zona>> = {
  espalda_alta: { ovalos: [{ cx: 234, cy: 176, rx: 48, ry: 20, rot: -20 }], espejo: true },
  deltoide_anterior: { ovalos: [{ cx: 208, cy: 224, rx: 30, ry: 33, rot: 12 }], espejo: true },
  deltoide_lateral: { ovalos: [{ cx: 168, cy: 228, rx: 28, ry: 40, rot: 6 }], espejo: true },
  pecho: { ovalos: [{ cx: 240, cy: 258, rx: 42, ry: 38, rot: -8 }], espejo: true },
  oblicuos: { ovalos: [{ cx: 219, cy: 392, rx: 21, ry: 68, rot: 4 }], espejo: true },
  abdominales: { ovalos: [{ cx: 283, cy: 372, rx: 47, ry: 76 }] },
  biceps: { ovalos: [{ cx: 170, cy: 308, rx: 27, ry: 47, rot: 6 }], espejo: true },
  antebrazo: { ovalos: [{ cx: 139, cy: 418, rx: 31, ry: 62, rot: 9 }], espejo: true },
  aductores: { ovalos: [{ cx: 262, cy: 592, rx: 23, ry: 82, rot: 3 }], espejo: true },
  cuadriceps: { ovalos: [{ cx: 228, cy: 622, rx: 43, ry: 104, rot: 2 }], espejo: true },
  gemelos: { ovalos: [{ cx: 233, cy: 822, rx: 27, ry: 68, rot: -2 }], espejo: true },
};

const ESPALDA: Partial<Record<MuscleGroup, Zona>> = {
  espalda_alta: { ovalos: [{ cx: 880, cy: 218, rx: 92, ry: 72 }] },
  deltoide_posterior: { ovalos: [{ cx: 764, cy: 228, rx: 33, ry: 39, rot: -10 }], espejo: true },
  deltoide_lateral: { ovalos: [{ cx: 731, cy: 234, rx: 25, ry: 37, rot: -4 }], espejo: true },
  dorsal: { ovalos: [{ cx: 829, cy: 352, rx: 51, ry: 88, rot: 9 }], espejo: true },
  triceps: { ovalos: [{ cx: 729, cy: 312, rx: 29, ry: 54, rot: -5 }], espejo: true },
  antebrazo: { ovalos: [{ cx: 691, cy: 428, rx: 31, ry: 62, rot: -8 }], espejo: true },
  lumbares: { ovalos: [{ cx: 880, cy: 446, rx: 45, ry: 40 }] },
  gluteo: { ovalos: [{ cx: 846, cy: 522, rx: 43, ry: 45 }], espejo: true },
  isquiotibiales: { ovalos: [{ cx: 839, cy: 662, rx: 41, ry: 88, rot: -2 }], espejo: true },
  gemelos: { ovalos: [{ cx: 836, cy: 830, rx: 33, ry: 66, rot: 2 }], espejo: true },
};

/** Orden de pintado: lo de detrás primero, para que solapen bien. */
const FRENTE_ORDEN: MuscleGroup[] = [
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

const ESPALDA_ORDEN: MuscleGroup[] = [
  "espalda_alta",
  "deltoide_lateral",
  "deltoide_posterior",
  "dorsal",
  "triceps",
  "antebrazo",
  "lumbares",
  "gluteo",
  "isquiotibiales",
  "gemelos",
];

function ovalos(view: "frente" | "espalda", muscle: MuscleGroup): Ovalo[] {
  const zona = (view === "frente" ? FRENTE : ESPALDA)[muscle];
  if (!zona) return [];
  if (!zona.espejo) return zona.ovalos;
  const cx = CENTRO[view];
  return [
    ...zona.ovalos,
    ...zona.ovalos.map((o) => ({
      ...o,
      cx: 2 * cx - o.cx,
      rot: o.rot == null ? undefined : -o.rot,
    })),
  ];
}

function Ovalos({ lista }: { lista: Ovalo[] }) {
  return (
    <>
      {lista.map((o, i) => (
        <ellipse
          key={i}
          cx={o.cx}
          cy={o.cy}
          rx={o.rx}
          ry={o.ry}
          transform={o.rot ? `rotate(${o.rot} ${o.cx} ${o.cy})` : undefined}
        />
      ))}
    </>
  );
}

function Figura({
  view,
  tiers,
  onSelect,
  selected,
}: {
  view: "frente" | "espalda";
  tiers: Partial<Record<MuscleGroup, Tier>>;
  onSelect?: (muscle: MuscleGroup) => void;
  selected: MuscleGroup | null;
}) {
  // `useId` trae dos puntos, que no valen dentro de un url(#...) en todos
  // los navegadores.
  const uid = useId().replace(/:/g, "");
  const orden = view === "frente" ? FRENTE_ORDEN : ESPALDA_ORDEN;
  const { x, w } = RECORTE[view];

  return (
    <svg
      viewBox={`${x} 0 ${w} ${LAMINA_H}`}
      role="img"
      aria-label={`Figura humana de ${view === "frente" ? "frente" : "espaldas"}, con cada músculo coloreado según su rango`}
      style={{ width: "100%", height: "auto", isolation: "isolate", display: "block", borderRadius: "14px" }}
    >
      <defs>
        <mask
          id={`sil-${uid}`}
          maskUnits="userSpaceOnUse"
          x="0"
          y="0"
          width={LAMINA_W}
          height={LAMINA_H}
        >
          <image href="/entreno/cuerpo-silueta.png" x="0" y="0" width={LAMINA_W} height={LAMINA_H} />
        </mask>
        <filter id={`difu-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="7" />
        </filter>
      </defs>

      <image href="/entreno/cuerpo.webp" x="0" y="0" width={LAMINA_W} height={LAMINA_H} />

      <g mask={`url(#sil-${uid})`} style={{ mixBlendMode: "screen" }} filter={`url(#difu-${uid})`}>
        {orden.map((muscle) => {
          const tier = tiers[muscle];
          if (!tier || tier === "sin_datos") return null;
          return (
            <g
              key={muscle}
              fill={TIER_COLORS[tier]}
              opacity={selected && selected !== muscle ? 0.35 : 0.78}
            >
              <Ovalos lista={ovalos(view, muscle)} />
            </g>
          );
        })}
      </g>

      {/* Marca del músculo abierto: un contorno fino, ya sin mezclar. */}
      {selected && ovalos(view, selected).length > 0 ? (
        <g
          fill="none"
          stroke={TIER_EDGE[tiers[selected] ?? "sin_datos"]}
          strokeWidth={3}
          opacity={0.9}
          pointerEvents="none"
        >
          <Ovalos lista={ovalos(view, selected)} />
        </g>
      ) : null}

      {/* Zonas de toque, transparentes y por encima de todo. */}
      <g fill="transparent">
        {orden.map((muscle) => (
          <g
            key={muscle}
            role={onSelect ? "button" : undefined}
            tabIndex={onSelect ? 0 : undefined}
            aria-label={onSelect ? MUSCLE_LABELS[muscle] : undefined}
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
            style={{ cursor: onSelect ? "pointer" : undefined, outline: "none" }}
          >
            <Ovalos lista={ovalos(view, muscle)} />
          </g>
        ))}
      </g>
    </svg>
  );
}

export function BodyMap({ tiers, onSelect, selected = null, className, only }: BodyMapProps) {
  const vistas: ("frente" | "espalda")[] = only ? [only] : ["frente", "espalda"];

  return (
    <div className={className} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
      {vistas.map((view) => (
        <div key={view} style={{ flex: "1 1 0", minWidth: 0 }}>
          <Figura view={view} tiers={tiers} onSelect={onSelect} selected={selected} />
          <p
            className="text-center text-[var(--text-tertiary)]"
            style={{
              font: "600 11px var(--font-plex-sans), sans-serif",
              letterSpacing: "0.1em",
              marginTop: "2px",
            }}
          >
            {view === "frente" ? "FRENTE" : "ESPALDA"}
          </p>
        </div>
      ))}
    </div>
  );
}

/** Los músculos que cada vista pinta. Lo usa el test del contrato. */
export const BODY_MAP_COVERAGE = {
  frente: FRENTE_ORDEN,
  espalda: ESPALDA_ORDEN,
} as const;
