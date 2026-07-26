// Bug-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_BUG_MOVES: Move[] = [
  {
    id: "twineedle",
    name: "Twineedle",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits twice, with each hit having a 20% chance to poison the target. If the first hit breaks the target's substitute, it will take damage for the second hit.",

    type: "bug",
    category: "physical",

    power: 25,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 2,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "pin-missile",
    name: "Pin Missile",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits two to five times. Has a 35% chance to hit two or three times and a 15% chance to hit four or five times. If one of the hits breaks the target's substitute, it will take damage for the remaining hits. If the user has the Skill Link Ability, this move will always hit five times. If the user is holding Loaded Dice, this move will hit 4-5 times.",

    type: "bug",
    category: "physical",

    power: 25,
    accuracy: 95,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 5,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "string-shot",
    name: "String Shot",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's Speed by 2 stages.",

    type: "bug",
    category: "status",

    power: null,
    accuracy: 95,
    maxPp: 40,

    priority: 0,

    target: "all-opponents",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "speed", stages: -2 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "leech-life",
    name: "Leech Life",
    generation: 1,
    introducedGeneration: 1,
    description: "The user recovers 1/2 the HP lost by the target, rounded half up. If Big Root is held by the user, the HP recovered is 1.3x normal, rounded half down.",

    type: "bug",
    category: "physical",

    power: 80,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "drain",
      drainPercent: 50,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
