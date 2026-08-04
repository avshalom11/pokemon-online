// Ground-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_GROUND_MOVES: Move[] = [
  {
    id: "mud-slap",
    name: "Mud-Slap",
    generation: 2,
    introducedGeneration: 2,
    description: "The user hurls mud in the target's face, always lowering its accuracy by one stage.",

    type: "ground",
    category: "special",

    power: 20,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      changes: [{ stat: "accuracy", stages: -1 }],
      chancePercent: 100,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
