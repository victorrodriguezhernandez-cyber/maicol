"use client";

import { useId } from "react";
import { MUSCLE_LABELS, type MuscleGroup } from "@/lib/training/muscles";
import { TIER_COLORS, type Tier } from "@/lib/training/levels";

/**
 * El mapa muscular: dos figuras anatómicas, de frente y de espaldas, con
 * cada músculo relleno del color de su rango.
 *
 * ── El planteamiento, que es lo que fallaba antes ──────────────────────
 *
 * Las dos versiones anteriores dibujaban una silueta OSCURA sobre la que
 * se encendían músculos de colores. El resultado era una sombra con
 * manchas: el cuerpo sólo existía donde había color.
 *
 * Esto es al revés, y es lo que hace que parezca una lámina de anatomía:
 * el cuerpo entero es CLARO y está dividido en regiones por líneas
 * oscuras, como un grabado. Un músculo sin entrenar se queda en el claro
 * de base; cuando sube de rango, esa región se rellena de su color. El
 * dibujo existe siempre entero y el color entra dentro, en vez de que el
 * color sea lo único que se ve.
 *
 * Por eso el cuerpo incluye regiones que la app NO puntúa — cuello,
 * manos, rodillas, serrato, tibial, pies —: sin ellas la figura tendría
 * agujeros donde debería haber cuerpo. Esas no son interactivas y nunca
 * cambian de color.
 *
 * ── Por qué está dibujado aquí y no es una imagen ──────────────────────
 *
 * Los renders anatómicos de las apps de gimnasio son obra con derechos.
 * Éste está trazado desde cero. Además, al ser trazados, cada músculo se
 * colorea por separado y escala sin pixelarse; un PNG habría que
 * recortarlo en 17 trozos y seguiría sin escalar.
 *
 * ── Cómo está construido ───────────────────────────────────────────────
 *
 * Cada músculo puede tener VARIOS trazados (`parts`): el cuádriceps son
 * tres — recto femoral, vasto lateral y vasto interno —, el tríceps tiene
 * sus cabezas, el gemelo las suyas. Se pintan del mismo color con la línea
 * oscura entre medias, y eso es lo que da aspecto de músculo estriado en
 * vez de una cápsula lisa.
 *
 * Son trazados HERMANOS, nunca uno dentro de otro. Meter una forma dentro
 * de otra hace que `fill-rule` la recorte y salga un agujero — fue
 * exactamente lo que pasó con el vasto interno en la versión anterior.
 *
 * La figura es simétrica: cada músculo par se define una vez para el lado
 * izquierdo y se refleja. Escribir los dos lados a mano garantizaría que
 * un día dejen de coincidir.
 */

const FIG_W = 200;
const FIG_H = 492;
/** Eje de simetría de cada figura. */
const CX = 100;
/** Separación entre la figura de frente y la de espaldas. */
const GAP = 10;

/**
 * El claro del cuerpo y la línea que lo divide.
 *
 * Son valores fijos, no variables de tema: una lámina anatómica es oscuro
 * sobre claro siempre, igual que un rango tiene que ser del mismo color a
 * cualquier hora. La figura se lee igual sobre fondo negro que sobre
 * fondo blanco porque se dibuja entera a sí misma.
 */
const BASE_FILL = "#eef1f6";
const OUTLINE = "#0b0b10";

export interface BodyMapProps {
  /** Rango de cada músculo. Lo que no venga se queda en el claro de base. */
  tiers: Partial<Record<MuscleGroup, Tier>>;
  onSelect?: (muscle: MuscleGroup) => void;
  selected?: MuscleGroup | null;
  className?: string;
  /** Sólo una de las dos vistas, para sitios estrechos. */
  only?: "frente" | "espalda";
}

interface MusclePath {
  /** Uno o varios trazados HERMANOS del mismo músculo. */
  parts: string[];
  /** true = describe el lado izquierdo y hay que reflejarlo. */
  mirror: boolean;
}

/** Orden de pintado, de atrás hacia delante. */
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
 * El recto abdominal: ocho bloques, generados en vez de escritos a mano
 * para que los ocho salgan idénticos.
 */
function rectusAbdominis(): string[] {
  const filas = [
    { y: 140, h: 16 },
    { y: 159, h: 16 },
    { y: 178, h: 16 },
    { y: 197, h: 15 },
  ];
  const w = 14;
  const r = 3;
  const cols = [CX - 2 - w, CX + 2];
  const out: string[] = [];
  for (const { y, h } of filas) {
    for (const x of cols) {
      out.push(
        `M${x},${y + r} q0,${-r} ${r},${-r} h${w - r * 2} q${r},0 ${r},${r} ` +
          `v${h - r * 2} q0,${r} ${-r},${r} h${-(w - r * 2)} q${-r},0 ${-r},${-r} Z`,
      );
    }
  }
  return out;
}

// =========================================================================
// FRENTE
// =========================================================================

const FRONT_PATHS: Partial<Record<MuscleGroup, MusclePath>> = {
  espalda_alta: {
    parts: ["M90,60 C81,62 70,69 60,79 C56,83 55,89 59,92 C69,83 80,77 91,75 C94,73 93,62 90,60 Z"],
    mirror: true,
  },
  // Deltoides lateral: la cabeza externa, la que marca el ancho del hombro.
  deltoide_lateral: {
    parts: ["M59,82 C46,88 35,102 32,120 C30,134 32,147 37,155 C44,152 48,141 50,128 C52,111 55,92 59,82 Z"],
    mirror: true,
  },
  deltoide_anterior: {
    parts: ["M64,79 C56,88 50,101 48,116 C47,126 48,135 51,141 C57,138 61,128 63,116 C65,101 66,86 66,78 Z"],
    mirror: true,
  },
  // Pectoral en dos porciones — la clavicular arriba y la esternal abajo —
  // con la línea entre medias. Es lo que lo distingue de una almohadilla.
  pecho: {
    parts: [
      "M96,84 C85,81 73,84 66,91 C62,96 62,102 66,106 C74,111 87,112 95,110 C96,104 96,92 96,84 Z",
      "M95,112 C86,114 74,113 66,108 C61,113 59,120 63,127 C70,136 84,139 93,136 C96,134 96,127 95,112 Z",
    ],
    mirror: true,
  },
  abdominales: { parts: rectusAbdominis(), mirror: false },
  oblicuos: {
    parts: ["M80,140 C73,150 68,166 66,184 C65,198 68,210 74,216 C79,218 81,215 80,208 C78,190 78,162 82,144 Z"],
    mirror: true,
  },
  // Bíceps: las dos cabezas, larga y corta.
  biceps: {
    parts: [
      "M56,116 C46,124 39,140 37,158 C36,171 39,182 45,186 C50,188 53,184 54,174 C55,157 56,134 58,118 Z",
      "M62,120 C56,130 52,145 51,161 C50,172 52,180 56,183 C59,184 61,180 61,172 C61,157 62,136 64,122 Z",
    ],
    mirror: true,
  },
  // Antebrazo: braquiorradial por fuera, flexores por dentro.
  antebrazo: {
    parts: [
      "M45,184 C35,196 28,214 25,234 C23,252 26,266 32,275 C38,281 43,276 43,266 C43,250 44,231 46,213 C47,200 46,190 46,184 Z",
      "M52,192 C46,206 43,224 42,242 C41,254 43,264 47,270 C51,272 53,268 53,260 C53,246 53,228 54,212 C55,202 54,195 53,192 Z",
    ],
    mirror: true,
  },
  aductores: {
    parts: ["M96,258 C91,262 88,276 87,296 C86,316 87,332 90,344 C93,350 96,348 96,338 C97,316 97,282 96,258 Z"],
    mirror: true,
  },
  // Cuádriceps: recto femoral, vasto lateral y vasto interno. Tres piezas
  // del mismo color, que es lo que da la forma real del muslo.
  cuadriceps: {
    parts: [
      "M87,258 C79,258 73,270 71,288 C69,308 70,332 73,352 C75,366 79,376 84,381 C88,383 91,379 91,371 C91,352 92,326 93,302 C94,280 92,262 87,258 Z",
      "M70,262 C61,268 55,284 53,304 C51,324 53,344 57,358 C60,368 65,372 69,368 C71,362 70,344 70,326 C70,304 69,280 70,262 Z",
      "M93,318 C88,322 85,336 85,352 C85,366 89,376 94,376 C97,374 97,360 96,344 C95,330 94,321 93,318 Z",
    ],
    mirror: true,
  },
  gemelos: {
    parts: ["M84,392 C76,398 70,412 68,430 C67,445 70,458 75,464 C79,467 83,463 84,455 C85,440 85,418 85,404 Z"],
    mirror: true,
  },
};

/**
 * Regiones que la app no puntúa pero que el cuerpo necesita para no tener
 * agujeros: cabeza, cuello, serrato, cadera, manos, rodillas, tibial,
 * pies. Siempre del claro de base, y no capturan clics.
 */
const FRONT_BASE: MusclePath[] = [
  { parts: ["M100,8 C113,8 122,18 122,32 C122,45 114,55 100,58 C86,55 78,45 78,32 C78,18 87,8 100,8 Z"], mirror: false },
  { parts: ["M88,50 C88,63 84,73 90,80 L110,80 C116,73 112,63 112,50 Z"], mirror: false },
  {
    parts: [
      "M67,128 C63,132 61,138 62,143 C66,141 70,137 72,132 Z",
      "M69,139 C65,144 63,150 64,155 C68,153 72,148 74,143 Z",
      "M71,150 C67,155 65,161 66,166 C70,164 74,159 76,154 Z",
    ],
    mirror: true,
  },
  { parts: ["M74,214 C70,226 70,240 74,252 L126,252 C130,240 130,226 126,214 C112,222 88,222 74,214 Z"], mirror: false },
  { parts: ["M33,270 C25,272 21,280 21,290 C21,300 26,308 34,308 C42,308 46,301 46,292 C46,282 41,271 33,270 Z"], mirror: true },
  { parts: ["M62,368 C58,376 58,386 62,392 C70,396 84,396 92,392 C96,386 96,376 92,368 C82,372 72,372 62,368 Z"], mirror: true },
  { parts: ["M88,394 C84,404 82,420 82,436 C82,450 85,460 89,463 C92,463 93,456 93,446 C93,428 92,408 90,396 Z"], mirror: true },
  { parts: ["M70,462 C64,470 62,479 66,483 L92,483 C96,479 95,470 91,462 Z"], mirror: true },
];

// =========================================================================
// ESPALDA
// =========================================================================

const BACK_PATHS: Partial<Record<MuscleGroup, MusclePath>> = {
  // Trapecio en dos porciones: la superior (cuello a hombro) y el rombo
  // central. Cruza el eje, así que no se refleja.
  espalda_alta: {
    parts: [
      "M100,58 C88,58 76,66 65,78 C61,83 61,90 65,94 C74,86 86,82 100,82 C114,82 126,86 135,94 C139,90 139,83 135,78 C124,66 112,58 100,58 Z",
      "M100,84 C87,84 76,88 68,95 C74,112 85,130 95,141 C98,144 102,144 105,141 C115,130 126,112 132,95 C124,88 113,84 100,84 Z",
    ],
    mirror: false,
  },
  deltoide_lateral: {
    parts: ["M59,82 C46,88 35,102 32,120 C30,134 32,147 37,155 C44,152 48,141 50,128 C52,111 55,92 59,82 Z"],
    mirror: true,
  },
  deltoide_posterior: {
    parts: ["M64,80 C56,89 50,102 48,117 C47,127 48,136 51,142 C57,139 61,129 63,117 C65,102 66,87 66,79 Z"],
    mirror: true,
  },
  // Dorsal: el redondo mayor arriba y el gran dorsal en V debajo.
  dorsal: {
    parts: [
      "M67,97 C61,101 57,109 57,117 C61,121 69,121 75,117 C78,111 76,103 71,98 Z",
      "M58,111 C49,125 45,143 46,163 C48,181 56,196 68,206 C78,213 89,216 96,212 C97,191 97,159 95,135 C93,121 86,111 76,107 C69,104 61,106 58,111 Z",
    ],
    mirror: true,
  },
  lumbares: {
    parts: ["M92,160 C88,174 86,192 87,208 C88,221 93,228 98,228 C100,228 100,220 100,211 C99,193 98,172 97,158 Z"],
    mirror: true,
  },
  // Tríceps: cabeza larga y cabeza lateral, la herradura.
  triceps: {
    parts: [
      "M57,114 C46,122 39,138 37,157 C36,170 39,181 45,185 C50,187 53,183 54,173 C55,156 56,132 58,116 Z",
      "M63,120 C56,130 52,145 51,161 C50,172 52,180 56,183 C59,184 61,180 61,172 C61,157 62,136 64,122 Z",
    ],
    mirror: true,
  },
  antebrazo: {
    parts: [
      "M45,184 C35,196 28,214 25,234 C23,252 26,266 32,275 C38,281 43,276 43,266 C43,250 44,231 46,213 C47,200 46,190 46,184 Z",
      "M52,192 C46,206 43,224 42,242 C41,254 43,264 47,270 C51,272 53,268 53,260 C53,246 53,228 54,212 C55,202 54,195 53,192 Z",
    ],
    mirror: true,
  },
  gluteo: {
    parts: ["M97,232 C82,231 68,239 62,252 C57,264 59,279 68,289 C79,299 91,300 96,294 C98,290 98,274 98,258 C98,242 98,234 97,232 Z"],
    mirror: true,
  },
  // Isquiotibiales: bíceps femoral por fuera, semitendinoso por dentro.
  isquiotibiales: {
    parts: [
      "M92,296 C79,296 69,308 66,326 C63,345 64,364 68,378 C71,388 78,388 81,378 C84,362 87,342 90,324 C93,308 93,299 92,296 Z",
      "M65,302 C58,312 54,330 54,348 C54,364 57,376 62,380 C65,381 67,376 67,368 C67,350 66,324 66,306 Z",
    ],
    mirror: true,
  },
  // Gemelo con sus dos cabezas: la interna baja más que la externa, que es
  // lo que le da la forma de diamante visto por detrás.
  gemelos: {
    parts: [
      "M85,392 C78,398 73,412 72,430 C71,445 74,458 79,464 C83,467 86,463 87,455 C88,440 87,418 87,404 Z",
      "M70,396 C64,404 60,418 60,434 C60,447 63,457 68,461 C71,462 73,457 73,449 C73,433 72,412 71,398 Z",
    ],
    mirror: true,
  },
};

const BACK_BASE: MusclePath[] = [
  { parts: ["M100,8 C113,8 122,18 122,32 C122,45 114,55 100,58 C86,55 78,45 78,32 C78,18 87,8 100,8 Z"], mirror: false },
  { parts: ["M88,50 C88,63 84,73 90,80 L110,80 C116,73 112,63 112,50 Z"], mirror: false },
  { parts: ["M74,214 C70,224 70,236 74,246 L126,246 C130,236 130,224 126,214 C112,222 88,222 74,214 Z"], mirror: false },
  { parts: ["M33,270 C25,272 21,280 21,290 C21,300 26,308 34,308 C42,308 46,301 46,292 C46,282 41,271 33,270 Z"], mirror: true },
  { parts: ["M62,374 C58,382 58,390 62,396 C70,400 84,400 92,396 C96,390 96,382 92,374 C82,378 72,378 62,374 Z"], mirror: true },
  { parts: ["M70,462 C64,470 62,479 66,483 L92,483 C96,479 95,470 91,462 Z"], mirror: true },
];

/**
 * Líneas de detalle: la columna, la línea alba, los dedos. Sin relleno y
 * sin capturar clics, sólo para que el dibujo no quede desnudo.
 */
const FRONT_DETAILS: MusclePath[] = [
  { parts: ["M100,86 L100,136"], mirror: false },
  { parts: ["M100,138 L100,212"], mirror: false },
  { parts: ["M27,276 L24,296", "M33,272 L31,299", "M39,272 L39,299", "M45,276 L46,295"], mirror: true },
];

const BACK_DETAILS: MusclePath[] = [
  { parts: ["M100,84 L100,246"], mirror: false },
  { parts: ["M27,276 L24,296", "M33,272 L31,299", "M39,272 L39,299", "M45,276 L46,295"], mirror: true },
];

// =========================================================================

function renderPath(path: MusclePath, fill: string, keyPrefix: string) {
  const sides = path.mirror ? [false, true] : [false];
  return sides.flatMap((mirrored) =>
    path.parts.map((d, i) => (
      <path
        key={`${keyPrefix}-${mirrored}-${i}`}
        d={d}
        fill={fill}
        stroke={OUTLINE}
        strokeWidth={1.6}
        strokeLinejoin="round"
        transform={mirrored ? `translate(${CX * 2},0) scale(-1,1)` : undefined}
        style={{ transition: "fill 340ms ease" }}
      />
    )),
  );
}

function Figure({
  view,
  tiers,
  onSelect,
  selected,
}: {
  view: "frente" | "espalda";
  tiers: Partial<Record<MuscleGroup, Tier>>;
  onSelect?: (m: MuscleGroup) => void;
  selected?: MuscleGroup | null;
}) {
  const muscles = view === "frente" ? FRONT_MUSCLES : BACK_MUSCLES;
  const paths = view === "frente" ? FRONT_PATHS : BACK_PATHS;
  const base = view === "frente" ? FRONT_BASE : BACK_BASE;
  const details = view === "frente" ? FRONT_DETAILS : BACK_DETAILS;

  return (
    <g>
      {base.map((region, i) => (
        <g key={`base-${i}`} pointerEvents="none">
          {renderPath(region, BASE_FILL, `base-${i}`)}
        </g>
      ))}

      {muscles.map((muscle) => {
        const path = paths[muscle];
        if (!path) return null;
        const tier = tiers[muscle] ?? "sin_datos";
        const isSelected = selected === muscle;

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
            aria-label={onSelect ? `${MUSCLE_LABELS[muscle]} (toca para ver su nivel)` : undefined}
            style={{
              cursor: onSelect ? "pointer" : undefined,
              filter: isSelected ? "drop-shadow(0 0 6px rgba(255,255,255,0.95))" : undefined,
            }}
          >
            <title>{MUSCLE_LABELS[muscle]}</title>
            {renderPath(path, TIER_COLORS[tier], muscle)}
          </g>
        );
      })}

      <g
        aria-hidden="true"
        pointerEvents="none"
        fill="none"
        stroke={OUTLINE}
        strokeWidth={1.4}
        strokeLinecap="round"
      >
        {details.flatMap((linea, i) =>
          (linea.mirror ? [false, true] : [false]).flatMap((mirrored) =>
            linea.parts.map((d, j) => (
              <path
                key={`det-${i}-${mirrored}-${j}`}
                d={d}
                transform={mirrored ? `translate(${CX * 2},0) scale(-1,1)` : undefined}
              />
            )),
          ),
        )}
      </g>
    </g>
  );
}

export function BodyMap({ tiers, onSelect, selected = null, className, only }: BodyMapProps) {
  const titleId = useId();
  const both = !only;
  const width = both ? FIG_W * 2 + GAP : FIG_W;

  return (
    <svg
      viewBox={`0 0 ${width} ${FIG_H + 22}`}
      className={className}
      role="img"
      aria-labelledby={titleId}
      style={{ width: "100%", height: "auto", overflow: "visible" }}
    >
      <title id={titleId}>
        Figura humana de frente y de espaldas, con cada músculo coloreado según su rango
      </title>

      {both || only === "frente" ? (
        <g>
          <Figure view="frente" tiers={tiers} onSelect={onSelect} selected={selected} />
          <text
            x={CX}
            y={FIG_H + 16}
            textAnchor="middle"
            fill="var(--text-tertiary)"
            style={{ font: "600 13px var(--font-plex-sans), sans-serif", letterSpacing: "0.08em" }}
          >
            FRENTE
          </text>
        </g>
      ) : null}

      {both || only === "espalda" ? (
        <g transform={both ? `translate(${FIG_W + GAP},0)` : undefined}>
          <Figure view="espalda" tiers={tiers} onSelect={onSelect} selected={selected} />
          <text
            x={CX}
            y={FIG_H + 16}
            textAnchor="middle"
            fill="var(--text-tertiary)"
            style={{ font: "600 13px var(--font-plex-sans), sans-serif", letterSpacing: "0.08em" }}
          >
            ESPALDA
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/** Los músculos que cada vista pinta. Lo usa el test del contrato. */
export const BODY_MAP_COVERAGE = {
  frente: FRONT_MUSCLES,
  espalda: BACK_MUSCLES,
} as const;
