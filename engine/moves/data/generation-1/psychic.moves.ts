// Psychic-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_PSYCHIC_MOVES: Move[] = [
  {
    id: "psybeam",
    name: "Psybeam",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to confuse the target.",

    type: "psychic",
    category: "special",

    power: 65,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "confusion",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "confusion",
    name: "Confusion",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to confuse the target.",

    type: "psychic",
    category: "special",

    power: 50,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "confusion",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "psychic",
    name: "Psychic",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to lower the target's Special Defense by 1 stage.",

    type: "psychic",
    category: "special",

    power: 90,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

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
    id: "hypnosis",
    name: "Hypnosis",
    generation: 1,
    introducedGeneration: 1,
    description: "Causes the target to fall asleep.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: 60,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "sleep",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "meditate",
    name: "Meditate",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Attack by 1 stage.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 40,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "attack", stages: 1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "agility",
    name: "Agility",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Speed by 2 stages.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "speed", stages: 2 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "teleport",
    name: "Teleport",
    generation: 1,
    introducedGeneration: 1,
    description: "If this move is successful and the user has not fainted, the user switches out even if it is trapped and is replaced immediately by a selected party member. The user does not switch out if there are no unfainted party members.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: -6,

    target: "self",

    effect: { kind: "switch-out" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "barrier",
    name: "Barrier",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Defense by 2 stages.",

    type: "psychic",
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

  {
    id: "light-screen",
    name: "Light Screen",
    generation: 1,
    introducedGeneration: 1,
    description: "For 5 turns, the user and its party members take 0.5x damage from special attacks, or 0.66x damage if in a Double Battle. Damage is not reduced further with Aurora Veil. Critical hits ignore this effect. It is removed from the user's side if the user or an ally is successfully hit by Brick Break, Psychic Fangs, or Defog. Lasts for 8 turns if the user is holding Light Clay. Fails if the effect is already active on the user's side.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "self",

    effect: {
      kind: "screen",
      screen: "light-screen",
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "reflect",
    name: "Reflect",
    generation: 1,
    introducedGeneration: 1,
    description: "For 5 turns, the user and its party members take 0.5x damage from physical attacks, or 0.66x damage if in a Double Battle. Damage is not reduced further with Aurora Veil. Critical hits ignore this effect. It is removed from the user's side if the user or an ally is successfully hit by Brick Break, Psychic Fangs, or Defog. Lasts for 8 turns if the user is holding Light Clay. Fails if the effect is already active on the user's side.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: 0,

    target: "self",

    effect: {
      kind: "screen",
      screen: "reflect",
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "amnesia",
    name: "Amnesia",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Special Defense by 2 stages.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "specialDefense", stages: 2 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "kinesis",
    name: "Kinesis",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's accuracy by 1 stage.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: 80,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "accuracy", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "dream-eater",
    name: "Dream Eater",
    generation: 1,
    introducedGeneration: 1,
    description: "The target is unaffected by this move unless it is asleep. The user recovers 1/2 the HP lost by the target, rounded half up. If Big Root is held by the user, the HP recovered is 1.3x normal, rounded half down.",

    type: "psychic",
    category: "special",

    power: 100,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "drain",
      drainPercent: 50,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "psywave",
    name: "Psywave",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the target equal to (user's level) * (X + 50) / 100, where X is a random number from 0 to 100, rounded down, but not less than 1 HP.",

    type: "psychic",
    category: "special",

    power: null,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: { kind: "random-level-damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "rest",
    name: "Rest",
    generation: 1,
    introducedGeneration: 1,
    description: "The user falls asleep for the next two turns and restores all of its HP, curing itself of any non-volatile status condition in the process. Fails if the user has full HP, is already asleep, or if another effect is preventing sleep.",

    type: "psychic",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 5,

    priority: 0,

    target: "self",

    effect: {
      kind: "heal",
      healPercent: 100,
    },

    flags: [],

    implementationStatus: "data-only",
  },
];
