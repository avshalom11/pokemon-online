// Rock-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_ROCK_MOVES: Move[] = [
  {
    id: "rock-throw",
    name: "Rock Throw",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "rock",
    category: "physical",

    power: 50,
    accuracy: 90,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "rock-slide",
    name: "Rock Slide",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to make the target flinch.",

    type: "rock",
    category: "physical",

    power: 75,
    accuracy: 90,
    maxPp: 10,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 30,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
