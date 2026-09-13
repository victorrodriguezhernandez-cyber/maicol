import type { RoutineGoal } from "./types";

/**
 * Estructuras de rutina clásicas.
 *
 * ── Por qué sólo traen los DÍAS y no los ejercicios ────────────────────
 *
 * Porque una plantilla con ejercicios concretos sería mentira: no sé qué
 * material tienes, qué te sienta mal ni qué sabes hacer. Rellenarla con
 * "press de banca con barra" para alguien que entrena en casa con dos
 * mancuernas es exactamente el tipo de funcionalidad que aparenta
 * funcionar y no funciona (regla 9 del proyecto).
 *
 * Lo que sí aporta la plantilla es la parte difícil y genérica: cómo
 * repartir los grupos musculares entre los días para que la semana quede
 * equilibrada y cada músculo tenga tiempo de recuperarse. Los ejercicios
 * los eliges tú del catálogo, o se los pides a la IA, que sí sabe con qué
 * material cuentas.
 */

export interface RoutineTemplate {
  id: string;
  name: string;
  goal: RoutineGoal;
  description: string;
  days: { name: string }[];
}

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    id: "cuerpo_entero_3",
    name: "Cuerpo entero · 3 días",
    goal: "hipertrofia",
    description:
      "Cada día tocas todo el cuerpo. Es lo que más rinde cuando entrenas tres días o menos, porque cada músculo recibe estímulo tres veces por semana en vez de una.",
    days: [{ name: "Cuerpo entero A" }, { name: "Cuerpo entero B" }, { name: "Cuerpo entero C" }],
  },
  {
    id: "torso_pierna_4",
    name: "Torso / Pierna · 4 días",
    goal: "hipertrofia",
    description:
      "Dos días de tren superior y dos de inferior. El reparto más equilibrado para cuatro días: cada mitad del cuerpo se entrena dos veces por semana con 72 horas entre medias.",
    days: [{ name: "Torso A" }, { name: "Pierna A" }, { name: "Torso B" }, { name: "Pierna B" }],
  },
  {
    id: "ppl_6",
    name: "Empuje / Tirón / Pierna · 6 días",
    goal: "hipertrofia",
    description:
      "Separa lo que empuja (pecho, hombro, tríceps), lo que tira (espalda, bíceps) y la pierna. Mucho volumen por músculo, pero exige poder ir seis días sin fallar.",
    days: [
      { name: "Empuje A" }, { name: "Tirón A" }, { name: "Pierna A" },
      { name: "Empuje B" }, { name: "Tirón B" }, { name: "Pierna B" },
    ],
  },
  {
    id: "fuerza_4",
    name: "Fuerza · 4 días",
    goal: "fuerza",
    description:
      "Organizada alrededor de los cuatro básicos: sentadilla, press banca, peso muerto y press militar. Series bajas, cargas altas y descansos largos.",
    days: [
      { name: "Sentadilla" }, { name: "Press banca" },
      { name: "Peso muerto" }, { name: "Press militar" },
    ],
  },
  {
    id: "superior_inferior_2",
    name: "Mantenimiento · 2 días",
    goal: "mantenimiento",
    description:
      "Dos sesiones de cuerpo entero para semanas complicadas. No busca progresar: busca que no se pierda lo ganado, que con dos días bien puestos se consigue.",
    days: [{ name: "Sesión A" }, { name: "Sesión B" }],
  },
];
