import { notFound } from "next/navigation";
import { PhysiqueCard } from "@/components/training/PhysiqueCard";
import { computeMuscleLevel, type MuscleStats } from "@/lib/training/levels";
import { computeWeeklyVolume } from "@/lib/training/volume";
import { MUSCLE_GROUPS, type MuscleGroup } from "@/lib/training/muscles";

/**
 * Vista previa de la tarjeta de físico — SOLO en desarrollo.
 *
 * Monta el componente REAL con un historial inventado, para poder revisar
 * el mapa, los iconos y las insignias sin tener que entrenar seis meses
 * antes de ver un rango alto.
 */
export default function PreviewFisicoPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const perfiles: Partial<Record<MuscleGroup, Partial<MuscleStats>>> = {
    pecho: { weeksAtMev: 7, weeksObserved: 8, totalSets: 210, strengthGain: 0.3, sessionsOnMainLift: 9 },
    dorsal: { weeksAtMev: 8, weeksObserved: 8, totalSets: 340, strengthGain: 0.45, sessionsOnMainLift: 12 },
    espalda_alta: { weeksAtMev: 5, weeksObserved: 8, totalSets: 90 },
    deltoide_anterior: { weeksAtMev: 6, weeksObserved: 8, totalSets: 80 },
    deltoide_lateral: { weeksAtMev: 2, weeksObserved: 8, totalSets: 26 },
    deltoide_posterior: { weeksAtMev: 1, weeksObserved: 8, totalSets: 14 },
    biceps: { weeksAtMev: 6, weeksObserved: 8, totalSets: 160, strengthGain: 0.2, sessionsOnMainLift: 7 },
    triceps: { weeksAtMev: 5, weeksObserved: 8, totalSets: 120 },
    antebrazo: { weeksAtMev: 1, weeksObserved: 8, totalSets: 18 },
    abdominales: { weeksAtMev: 8, weeksObserved: 8, totalSets: 380, strengthGain: 0.5, sessionsOnMainLift: 14 },
    oblicuos: { weeksAtMev: 2, weeksObserved: 8, totalSets: 22 },
    lumbares: { weeksAtMev: 6, weeksObserved: 8, totalSets: 70 },
    gluteo: { weeksAtMev: 5, weeksObserved: 8, totalSets: 110 },
    cuadriceps: { weeksAtMev: 7, weeksObserved: 8, totalSets: 300, strengthGain: 0.4, sessionsOnMainLift: 10 },
    isquiotibiales: { weeksAtMev: 6, weeksObserved: 8, totalSets: 180, strengthGain: 0.25, sessionsOnMainLift: 8 },
    gemelos: { weeksAtMev: 1, weeksObserved: 8, totalSets: 12 },
  };

  const stats = Object.fromEntries(
    MUSCLE_GROUPS.map((m) => [
      m,
      {
        muscle: m,
        weeksAtMev: 0,
        weeksObserved: 8,
        totalSets: 0,
        strengthGain: null,
        sessionsOnMainLift: 0,
        ...perfiles[m],
      } satisfies MuscleStats,
    ]),
  ) as Record<MuscleGroup, MuscleStats>;

  const levels = MUSCLE_GROUPS.map((m) => computeMuscleLevel(stats[m]));

  // Volumen de una semana de ejemplo, para la ficha de cada músculo.
  const volume = computeWeeklyVolume([
    ...Array.from({ length: 12 }, () => ({
      setType: "normal",
      primaryMuscle: "pecho" as MuscleGroup,
      secondaryMuscles: ["triceps", "deltoide_anterior"] as MuscleGroup[],
    })),
    ...Array.from({ length: 16 }, () => ({
      setType: "normal",
      primaryMuscle: "dorsal" as MuscleGroup,
      secondaryMuscles: ["biceps"] as MuscleGroup[],
    })),
    ...Array.from({ length: 3 }, () => ({
      setType: "normal",
      primaryMuscle: "gemelos" as MuscleGroup,
      secondaryMuscles: [] as MuscleGroup[],
    })),
  ]);

  return (
    <main className="mx-auto w-full max-w-lg px-4 py-8">
      <p
        className="mb-6 rounded-xl px-3 py-2 text-xs"
        style={{ background: "var(--warning-soft)", color: "var(--warning)" }}
      >
        Vista previa con un historial inventado. Sólo existe en desarrollo.
      </p>
      <PhysiqueCard levels={levels} stats={stats} volume={volume} sessionsLogged={24} />
    </main>
  );
}
