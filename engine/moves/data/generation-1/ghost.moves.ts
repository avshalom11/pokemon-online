// Ghost-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_GHOST_MOVES: Move[] = [
  {
    id: "night-shade",
    name: "Night Shade",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the target equal to the user's level.",

    type: "ghost",
    category: "special",

    power: null,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "fixed-damage",
      damage: {
        basis: "level",
      },
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "confuse-ray",
    name: "Confuse Ray",
    generation: 1,
    introducedGeneration: 1,
    description: "Causes the target to become confused.",

    type: "ghost",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "confusion",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "lick",
    name: "Lick",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to paralyze the target.",

    type: "ghost",
    category: "physical",

    power: 30,
    accuracy: 100,
    maxPp: 30,

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
];
