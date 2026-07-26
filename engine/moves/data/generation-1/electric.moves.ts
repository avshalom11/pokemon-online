// Electric-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_ELECTRIC_MOVES: Move[] = [
  {
    id: "thunder-punch",
    name: "Thunder Punch",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to paralyze the target.",

    type: "electric",
    category: "physical",

    power: 75,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 10,
    },

    flags: ["makesContact", "protectable", "mirrorMove", "punching"],

    implementationStatus: "data-only",
  },

  {
    id: "thunder-shock",
    name: "Thunder Shock",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to paralyze the target.",

    type: "electric",
    category: "special",

    power: 40,
    accuracy: 100,
    maxPp: 30,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "thunderbolt",
    name: "Thunderbolt",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to paralyze the target.",

    type: "electric",
    category: "special",

    power: 90,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "thunder-wave",
    name: "Thunder Wave",
    generation: 1,
    introducedGeneration: 1,
    description: "Paralyzes the target. This move does not ignore type immunity.",

    type: "electric",
    category: "status",

    power: null,
    accuracy: 90,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "paralysis",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "thunder",
    name: "Thunder",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to paralyze the target. This move can hit a target using Bounce, Fly, or Sky Drop, or is under the effect of Sky Drop. If the weather is Primordial Sea or Rain Dance, this move does not check accuracy. If the weather is Desolate Land or Sunny Day, this move's accuracy is 50%. If this move is used against a Pokemon holding Utility Umbrella, this move's accuracy remains at 70%.",

    type: "electric",
    category: "special",

    power: 110,
    accuracy: 70,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "paralysis",
      chancePercent: 30,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
