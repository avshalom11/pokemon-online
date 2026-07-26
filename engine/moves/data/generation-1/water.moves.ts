// Water-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_WATER_MOVES: Move[] = [
  {
    id: "water-gun",
    name: "Water Gun",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "water",
    category: "special",

    power: 40,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "hydro-pump",
    name: "Hydro Pump",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "water",
    category: "special",

    power: 110,
    accuracy: 80,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "surf",
    name: "Surf",
    generation: 1,
    introducedGeneration: 1,
    description: "Damage doubles if the target is using Dive.",

    type: "water",
    category: "special",

    power: 90,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "all-pokemon",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "bubble-beam",
    name: "Bubble Beam",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to lower the target's Speed by 1 stage.",

    type: "water",
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
        { stat: "speed", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "withdraw",
    name: "Withdraw",
    generation: 1,
    introducedGeneration: 1,
    description: "Raises the user's Defense by 1 stage.",

    type: "water",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 40,

    priority: 0,

    target: "self",

    effect: {
      kind: "stat-change",
      changes: [
        { stat: "defense", stages: 1 },
      ],
    },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "waterfall",
    name: "Waterfall",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 20% chance to make the target flinch.",

    type: "water",
    category: "physical",

    power: 80,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 20,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "clamp",
    name: "Clamp",
    generation: 1,
    introducedGeneration: 1,
    description: "Prevents the target from switching for four or five turns (seven turns if the user is holding Grip Claw). Causes damage to the target equal to 1/8 of its maximum HP (1/6 if the user is holding Binding Band), rounded down, at the end of each turn during effect. The target can still switch out if it is holding Shed Shell or uses Baton Pass, Flip Turn, Parting Shot, Shed Tail, Teleport, U-turn, or Volt Switch. The effect ends if either the user or the target leaves the field, or if the target uses Mortal Spin, Rapid Spin, or Substitute successfully. This effect is not stackable or reset by using this or another binding move.",

    type: "water",
    category: "physical",

    power: 35,
    accuracy: 85,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: { kind: "partial-trap" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "bubble",
    name: "Bubble",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to lower the target's Speed by 1 stage.",

    type: "water",
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
        { stat: "speed", stages: -1 },
      ],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "crabhammer",
    name: "Crabhammer",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a higher chance for a critical hit.",

    type: "water",
    category: "physical",

    power: 100,
    accuracy: 90,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
