import type { MuscleGroup } from "@/lib/training/muscles";

/**
 * Un icono por grupo muscular.
 *
 * No son iconos genéricos de gimnasio: cada uno es la SILUETA de ese
 * músculo, recortada de la misma figura del mapa corporal. Así el icono
 * que ves junto a "Dorsal" en una lista es literalmente la forma que se
 * ilumina en el mapa cuando entrenas dorsal, y las dos cosas se reconocen
 * como la misma sin tener que leer nada.
 *
 * Cada uno va en su propio `viewBox` ajustado a la forma, para que todos
 * ocupen el mismo cuadrado visual aunque el músculo real sea largo y
 * estrecho (un antebrazo) o ancho y plano (un pectoral).
 *
 * Se rellenan con `currentColor`, así que heredan el color del rango
 * allá donde se pongan.
 */

interface IconShape {
  /** viewBox recortado a la forma. */
  box: string;
  /** Trazado, en las coordenadas originales de BodyMap. */
  d: string;
  /** Dibujar también el reflejo, para los pares. */
  pair?: boolean;
}

/** Eje de simetría de la figura original. */
const CX = 100;

const SHAPES: Record<MuscleGroup, IconShape> = {
  pecho: {
    box: "48 80 104 54",
    d: "M97,86 C80,85 64,89 56,97 C50,104 50,113 56,120 C64,128 79,131 90,129 C96,128 97,124 97,116 C98,104 98,95 97,86 Z",
    pair: true,
  },
  dorsal: {
    box: "38 95 124 124",
    d: "M52,102 C43,118 40,138 42,158 C44,177 52,193 64,203 C74,211 86,215 93,211 C95,189 95,157 93,132 C91,117 83,104 73,99 C64,95 55,97 52,102 Z",
    pair: true,
  },
  espalda_alta: {
    box: "62 58 76 94",
    d: "M100,62 C88,62 76,70 66,81 C62,86 62,93 66,98 C72,115 84,134 94,145 C97,148 103,148 106,145 C116,134 128,115 134,98 C138,93 138,86 134,81 C124,70 112,62 100,62 Z",
  },
  deltoide_anterior: {
    box: "38 76 48 50",
    d: "M57,84 C48,92 43,105 41,120 C46,122 54,116 59,105 C63,96 64,86 62,81 C60,79 58,81 57,84 Z",
    pair: true,
  },
  deltoide_lateral: {
    box: "25 82 54 76",
    d: "M53,86 C41,93 32,107 29,124 C28,136 29,146 33,153 C39,150 43,141 45,129 C47,114 49,95 53,86 Z",
    pair: true,
  },
  deltoide_posterior: {
    box: "38 78 48 50",
    d: "M57,86 C49,94 44,107 42,122 C47,124 55,118 60,107 C64,98 64,88 62,83 C60,81 58,83 57,86 Z",
    pair: true,
  },
  biceps: {
    box: "28 116 44 80",
    d: "M52,120 C40,128 33,145 32,163 C31,176 34,186 40,190 C45,192 49,188 50,178 C51,161 52,138 53,122 Z",
    pair: true,
  },
  triceps: {
    box: "29 114 44 80",
    d: "M53,118 C41,126 34,143 33,162 C32,175 35,185 41,189 C46,191 50,187 51,177 C52,160 53,137 54,120 Z",
    pair: true,
  },
  antebrazo: {
    box: "19 182 44 104",
    d: "M42,186 C32,198 25,216 23,237 C21,256 24,271 30,280 C36,286 42,281 42,271 C42,255 43,235 45,217 C46,204 44,192 43,186 Z",
    pair: true,
  },
  abdominales: {
    box: "78 131 44 78",
    d:
      "M81,138.5 q0,-3.5 3.5,-3.5 h10 q3.5,0 3.5,3.5 v13 q0,3.5 -3.5,3.5 h-10 q-3.5,0 -3.5,-3.5 Z " +
      "M102,138.5 q0,-3.5 3.5,-3.5 h10 q3.5,0 3.5,3.5 v13 q0,3.5 -3.5,3.5 h-10 q-3.5,0 -3.5,-3.5 Z " +
      "M81,162.5 q0,-3.5 3.5,-3.5 h10 q3.5,0 3.5,3.5 v13 q0,3.5 -3.5,3.5 h-10 q-3.5,0 -3.5,-3.5 Z " +
      "M102,162.5 q0,-3.5 3.5,-3.5 h10 q3.5,0 3.5,3.5 v13 q0,3.5 -3.5,3.5 h-10 q-3.5,0 -3.5,-3.5 Z " +
      "M81,186.5 q0,-3.5 3.5,-3.5 h10 q3.5,0 3.5,3.5 v15 q0,3.5 -3.5,3.5 h-10 q-3.5,0 -3.5,-3.5 Z " +
      "M102,186.5 q0,-3.5 3.5,-3.5 h10 q3.5,0 3.5,3.5 v15 q0,3.5 -3.5,3.5 h-10 q-3.5,0 -3.5,-3.5 Z",
  },
  oblicuos: {
    box: "60 132 80 88",
    d: "M80,136 C72,147 67,163 65,181 C64,195 67,206 73,212 C77,214 79,211 78,205 C76,188 76,160 81,140 Z",
    pair: true,
  },
  lumbares: {
    box: "82 152 36 78",
    d: "M92,158 C88,172 86,190 87,206 C88,219 93,226 98,226 C100,226 100,218 100,209 C99,191 98,170 97,156 Z",
    pair: true,
  },
  gluteo: {
    box: "56 226 88 78",
    d: "M97,232 C82,231 69,238 63,250 C58,261 59,276 68,286 C78,296 90,298 96,292 C98,289 98,274 98,260 C98,245 98,236 97,232 Z",
    pair: true,
  },
  cuadriceps: {
    box: "50 250 100 150",
    d: "M91,255 C75,253 64,265 59,284 C54,305 55,331 59,354 C62,372 67,384 74,391 C81,396 86,392 87,383 C88,363 89,338 90,314 C91,291 92,267 91,255 Z",
    pair: true,
  },
  isquiotibiales: {
    box: "55 290 90 100",
    d: "M92,294 C77,294 66,306 63,324 C60,343 61,362 65,376 C68,386 76,386 79,376 C82,360 85,340 88,322 C91,306 92,298 92,294 Z",
    pair: true,
  },
  aductores: {
    box: "82 254 36 96",
    d: "M96,258 C91,261 89,275 88,293 C87,312 88,328 90,340 C93,347 96,345 96,335 C97,314 97,283 96,258 Z",
    pair: true,
  },
  gemelos: {
    box: "60 374 80 104",
    d: "M85,378 C75,388 68,406 67,428 C66,447 70,462 76,470 C81,475 86,470 87,460 C88,443 88,421 87,402 Z",
    pair: true,
  },
};

export function MuscleIcon({
  muscle,
  size = 20,
  className,
}: {
  muscle: MuscleGroup;
  size?: number;
  className?: string;
}) {
  const shape = SHAPES[muscle];
  return (
    <svg
      width={size}
      height={size}
      viewBox={shape.box}
      className={className}
      fill="currentColor"
      aria-hidden="true"
    >
      <path d={shape.d} />
      {shape.pair ? (
        <path d={shape.d} transform={`translate(${CX * 2},0) scale(-1,1)`} />
      ) : null}
    </svg>
  );
}

/** Los músculos con icono. Lo usa el test del contrato. */
export const MUSCLE_ICON_COVERAGE = Object.keys(SHAPES) as MuscleGroup[];
