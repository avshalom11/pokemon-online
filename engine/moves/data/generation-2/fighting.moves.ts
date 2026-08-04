// Fighting-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_FIGHTING_MOVES: Move[] = [
  {
    id: "detect",
    name: "Detect",
    generation: 2,
    introducedGeneration: 2,
    description:
      "The user evades all attacks this turn. Represented with the same generic \"protect\" effect kind as Endure — this project's battle engine does not yet implement turn-protection mechanics.",

    type: "fighting",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 5,

    priority: 4,

    target: "self",

    effect: { kind: "protect" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "cross-chop",
    name: "Cross Chop",
    generation: 2,
    introducedGeneration: 2,
    description: "A double-chopping attack. High critical-hit ratio in the original games; this project's crit system is not move-specific yet, so that boost is not represented.",

    type: "fighting",
    category: "physical",

    power: 100,
    accuracy: 80,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "rock-smash",
    name: "Rock Smash",
    generation: 2,
    introducedGeneration: 2,
    description: "A punch that may lower the target's Defense by one stage.",

    type: "fighting",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      changes: [{ stat: "defense", stages: -1 }],
      chancePercent: 50,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
