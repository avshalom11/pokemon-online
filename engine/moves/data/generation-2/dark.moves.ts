// Dark-type moves introduced in Generation 2. A sibling to
// ../generation-1/dark.moves.ts (which holds Bite, retyped from Normal) —
// these are new move IDs, not a re-declaration of that file's moves.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_DARK_MOVES: Move[] = [
  {
    id: "thief",
    name: "Thief",
    generation: 2,
    introducedGeneration: 2,
    description:
      "An attack that also steals the target's held item. This project has no held-item inventory/equipment system yet, so this move deals damage only.",

    type: "dark",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "pursuit",
    name: "Pursuit",
    generation: 2,
    introducedGeneration: 2,
    description:
      "An attack that deals double damage against a target attempting to switch out. This project's battle engine does not yet detect an in-progress switch, so this move deals its normal damage only.",

    type: "dark",
    category: "physical",

    power: 40,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "faint-attack",
    name: "Faint Attack",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A sneak attack that never misses. Represented here with a high but ordinary accuracy value (100) since the move schema has no true never-miss flag.",

    type: "dark",
    category: "physical",

    power: 60,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "beat-up",
    name: "Beat Up",
    generation: 2,
    introducedGeneration: 2,
    description:
      "Each uninflicted member of the user's party takes a turn attacking the target once. Simplified to a fixed low-power 2-5 hit multi-hit attack — this project's battle engine has no concept of party-wide multi-attacker moves yet.",

    type: "dark",
    category: "physical",

    power: 10,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "multi-hit", minHits: 2, maxHits: 5 },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "crunch",
    name: "Crunch",
    generation: 2,
    introducedGeneration: 2,
    description: "A biting attack that may lower the target's Defense by one stage.",

    type: "dark",
    category: "physical",

    power: 80,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      changes: [{ stat: "defense", stages: -1 }],
      chancePercent: 20,
    },

    flags: ["makesContact", "biting", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
