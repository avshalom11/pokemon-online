// Ice-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_ICE_MOVES: Move[] = [
  {
    id: "icy-wind",
    name: "Icy Wind",
    generation: 2,
    introducedGeneration: 2,
    description: "A chilling attack that always lowers the target's Speed by one stage.",

    type: "ice",
    category: "special",

    power: 55,
    accuracy: 95,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      changes: [{ stat: "speed", stages: -1 }],
      chancePercent: 100,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "powder-snow",
    name: "Powder Snow",
    generation: 2,
    introducedGeneration: 2,
    description: "A chilling attack that may freeze every opponent it hits.",

    type: "ice",
    category: "special",

    power: 40,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "damage-with-status-chance",
      status: "freeze",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
