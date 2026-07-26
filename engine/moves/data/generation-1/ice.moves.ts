// Ice-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_ICE_MOVES: Move[] = [
  {
    id: "ice-punch",
    name: "Ice Punch",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to freeze the target.",

    type: "ice",
    category: "physical",

    power: 75,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "freeze",
      chancePercent: 10,
    },

    flags: ["makesContact", "protectable", "mirrorMove", "punching"],

    implementationStatus: "data-only",
  },

  {
    id: "mist",
    name: "Mist",
    generation: 1,
    introducedGeneration: 1,
    description: "For 5 turns, the user and its party members are protected from having their stat stages lowered by other Pokemon. Fails if the effect is already active on the user's side.",

    type: "ice",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "self",

    effect: {
      kind: "screen",
      screen: "mist",
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "ice-beam",
    name: "Ice Beam",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to freeze the target.",

    type: "ice",
    category: "special",

    power: 90,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "freeze",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "blizzard",
    name: "Blizzard",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to freeze the target. If the weather is Snow, this move does not check accuracy.",

    type: "ice",
    category: "special",

    power: 110,
    accuracy: 70,
    maxPp: 5,

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

  {
    id: "aurora-beam",
    name: "Aurora Beam",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to lower the target's Attack by 1 stage.",

    type: "ice",
    category: "special",

    power: 65,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-stat-change-chance",
      chancePercent: 10,
      changes: [
        { stat: "attack", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "haze",
    name: "Haze",
    generation: 1,
    introducedGeneration: 1,
    description: "Resets the stat stages of all active Pokemon to 0.",

    type: "ice",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 30,

    priority: 0,

    target: "all-pokemon",

    effect: { kind: "reset-stats" },

    flags: [],

    implementationStatus: "data-only",
  },
];
