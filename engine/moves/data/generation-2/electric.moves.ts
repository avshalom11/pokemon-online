// Electric-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_ELECTRIC_MOVES: Move[] = [
  {
    id: "spark",
    name: "Spark",
    generation: 2,
    introducedGeneration: 2,
    description: "An electrically-charged tackle that may paralyze the target.",

    type: "electric",
    category: "physical",

    power: 65,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 30,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "zap-cannon",
    name: "Zap Cannon",
    generation: 2,
    introducedGeneration: 2,
    description: "A high-power, low-accuracy electric blast that always paralyzes the target when it hits.",

    type: "electric",
    category: "special",

    power: 120,
    accuracy: 50,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 100,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
