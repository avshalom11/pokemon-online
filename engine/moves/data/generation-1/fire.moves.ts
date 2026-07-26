// Fire-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_FIRE_MOVES: Move[] = [
  {
    id: "fire-punch",
    name: "Fire Punch",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to burn the target.",

    type: "fire",
    category: "physical",

    power: 75,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "burn",
      chancePercent: 10,
    },

    flags: ["makesContact", "protectable", "mirrorMove", "punching"],

    implementationStatus: "data-only",
  },

  {
    id: "ember",
    name: "Ember",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to burn the target.",

    type: "fire",
    category: "special",

    power: 40,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "burn",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "flamethrower",
    name: "Flamethrower",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to burn the target.",

    type: "fire",
    category: "special",

    power: 90,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "burn",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "fire-spin",
    name: "Fire Spin",
    generation: 1,
    introducedGeneration: 1,
    description: "Prevents the target from switching for four or five turns (seven turns if the user is holding Grip Claw). Causes damage to the target equal to 1/8 of its maximum HP (1/6 if the user is holding Binding Band), rounded down, at the end of each turn during effect. The target can still switch out if it is holding Shed Shell or uses Baton Pass, Flip Turn, Parting Shot, Shed Tail, Teleport, U-turn, or Volt Switch. The effect ends if either the user or the target leaves the field, or if the target uses Mortal Spin, Rapid Spin, or Substitute successfully. This effect is not stackable or reset by using this or another binding move.",

    type: "fire",
    category: "special",

    power: 35,
    accuracy: 85,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: { kind: "partial-trap" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "fire-blast",
    name: "Fire Blast",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to burn the target.",

    type: "fire",
    category: "special",

    power: 110,
    accuracy: 85,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "burn",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
