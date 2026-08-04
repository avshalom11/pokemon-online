// Grass-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_GRASS_MOVES: Move[] = [
  {
    id: "giga-drain",
    name: "Giga Drain",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A nutrient-draining attack, healing the user for half the damage dealt. Reuses the existing \"drain\" effect kind Generation 1's Absorb/Mega Drain/Leech Life already use for this exact mechanic.",

    type: "grass",
    category: "special",

    power: 60,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "drain",
      drainPercent: 50,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
