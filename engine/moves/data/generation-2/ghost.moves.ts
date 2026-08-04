// Ghost-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_GHOST_MOVES: Move[] = [
  {
    id: "curse",
    name: "Curse",
    generation: 2,
    introducedGeneration: 2,
    description:
      "For a Ghost-type user, sacrifices HP to curse the target; for every other type, lowers the user's own Speed by one stage while raising its Attack and Defense by one stage each. This project's move data has no type-conditional branching, so only the (more broadly applicable) non-Ghost effect is represented.",

    type: "ghost",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 10,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "attack", stages: 1 },
        { stat: "defense", stages: 1 },
        { stat: "speed", stages: -1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "shadow-ball",
    name: "Shadow Ball",
    generation: 2,
    introducedGeneration: 2,
    description: "The user hurls a shadowy blob that may lower the target's Special Defense by one stage.",

    type: "ghost",
    category: "special",

    power: 80,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      changes: [{ stat: "specialDefense", stages: -1 }],
      chancePercent: 20,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
