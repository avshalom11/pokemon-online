// Poison-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_POISON_MOVES: Move[] = [
  {
    id: "poison-sting",
    name: "Poison Sting",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to poison the target.",

    type: "poison",
    category: "physical",

    power: 15,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "poison",
      chancePercent: 30,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "acid",
    name: "Acid",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to lower the target's Special Defense by 1 stage.",

    type: "poison",
    category: "special",

    power: 40,
    accuracy: 100,
    maxPp: 30,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "damage-with-stat-change-chance",
      chancePercent: 10,
      changes: [
        { stat: "specialDefense", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "poison-powder",
    name: "Poison Powder",
    generation: 1,
    introducedGeneration: 1,
    description: "Poisons the target.",

    type: "poison",
    category: "status",

    power: null,
    accuracy: 75,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "poison",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "toxic",
    name: "Toxic",
    generation: 1,
    introducedGeneration: 1,
    description: "Badly poisons the target. If a Poison-type Pokemon uses this move, the target cannot avoid the attack, even if the target is in the middle of a two-turn move.",

    type: "poison",
    category: "status",

    power: null,
    accuracy: 90,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "badly-poisoned",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "smog",
    name: "Smog",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 40% chance to poison the target.",

    type: "poison",
    category: "special",

    power: 30,
    accuracy: 70,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "poison",
      chancePercent: 40,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "sludge",
    name: "Sludge",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to poison the target.",

    type: "poison",
    category: "special",

    power: 65,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "poison",
      chancePercent: 30,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "poison-gas",
    name: "Poison Gas",
    generation: 1,
    introducedGeneration: 1,
    description: "Poisons the target.",

    type: "poison",
    category: "status",

    power: null,
    accuracy: 90,
    maxPp: 40,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "status",
      status: "poison",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "acid-armor",
    name: "Acid Armor",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Defense by 2 stages.",

    type: "poison",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "defense", stages: 2 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },
];
