// Grass-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_GRASS_MOVES: Move[] = [
  {
    id: "vine-whip",
    name: "Vine Whip",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "grass",
    category: "physical",

    power: 45,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "absorb",
    name: "Absorb",
    generation: 1,
    introducedGeneration: 1,
    description: "The user recovers 1/2 the HP lost by the target, rounded half up. If Big Root is held by the user, the HP recovered is 1.3x normal, rounded half down.",

    type: "grass",
    category: "special",

    power: 20,
    accuracy: 100,
    maxPp: 25,

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
    id: "mega-drain",
    name: "Mega Drain",
    generation: 1,
    introducedGeneration: 1,
    description: "The user recovers 1/2 the HP lost by the target, rounded half up. If Big Root is held by the user, the HP recovered is 1.3x normal, rounded half down.",

    type: "grass",
    category: "special",

    power: 40,
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
    id: "leech-seed",
    name: "Leech Seed",
    generation: 1,
    introducedGeneration: 1,
    description: "The Pokemon at the user's position steals 1/8 of the target's maximum HP, rounded down, at the end of each turn. If Big Root is held by the recipient, the HP recovered is 1.3x normal, rounded half down. If the target uses Baton Pass, the replacement will continue being leeched. If the target switches out or uses Mortal Spin or Rapid Spin successfully, the effect ends. Grass-type Pokemon are immune to this move on use, but not its effect.",

    type: "grass",
    category: "status",

    power: null,
    accuracy: 90,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "leech-seed" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "razor-leaf",
    name: "Razor Leaf",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a higher chance for a critical hit.",

    type: "grass",
    category: "physical",

    power: 55,
    accuracy: 95,
    maxPp: 25,

    priority: 0,

    target: "all-opponents",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove", "slicing"],

    implementationStatus: "data-only",
  },

  {
    id: "solar-beam",
    name: "Solar Beam",
    generation: 1,
    introducedGeneration: 1,
    description: "This attack charges on the first turn and executes on the second. Power is halved if the weather is Primordial Sea, Rain Dance, Sandstorm, or Snow and the user is not holding Utility Umbrella. If the user is holding a Power Herb or the weather is Desolate Land or Sunny Day, the move completes in one turn. If the user is holding Utility Umbrella and the weather is Desolate Land or Sunny Day, the move still requires a turn to charge.",

    type: "grass",
    category: "special",

    power: 120,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "charge",
      invulnerable: false,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "stun-spore",
    name: "Stun Spore",
    generation: 1,
    introducedGeneration: 1,
    description: "Paralyzes the target.",

    type: "grass",
    category: "status",

    power: null,
    accuracy: 75,
    maxPp: 30,

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
    id: "sleep-powder",
    name: "Sleep Powder",
    generation: 1,
    introducedGeneration: 1,
    description: "Causes the target to fall asleep.",

    type: "grass",
    category: "status",

    power: null,
    accuracy: 75,
    maxPp: 15,

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
    id: "petal-dance",
    name: "Petal Dance",
    generation: 1,
    introducedGeneration: 1,
    description: "The user spends two or three turns locked into this move and becomes confused immediately after its move on the last turn of the effect if it is not already. This move targets an opposing Pokemon at random on each turn. If the user is prevented from moving, is asleep at the beginning of a turn, or the attack is not successful against the target on the first turn of the effect or the second turn of a three-turn effect, the effect ends without causing confusion. If this move is called by Sleep Talk and the user is asleep, the move is used for one turn and does not confuse the user.",

    type: "grass",
    category: "special",

    power: 120,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "random-opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "spore",
    name: "Spore",
    generation: 1,
    introducedGeneration: 1,
    description: "Causes the target to fall asleep.",

    type: "grass",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "status",
      status: "sleep",
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
