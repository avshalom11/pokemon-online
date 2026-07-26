// Flying-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_FLYING_MOVES: Move[] = [
  {
    id: "gust",
    name: "Gust",
    generation: 1,
    introducedGeneration: 1,
    description: "Power doubles if the target is using Bounce, Fly, or Sky Drop, or is under the effect of Sky Drop.",

    type: "flying",
    category: "special",

    power: 40,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "wing-attack",
    name: "Wing Attack",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "flying",
    category: "physical",

    power: 60,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "fly",
    name: "Fly",
    generation: 1,
    introducedGeneration: 1,
    description: "This attack charges on the first turn and executes on the second. On the first turn, the user avoids all attacks other than Gust, Hurricane, Sky Uppercut, Smack Down, Thousand Arrows, Thunder, and Twister, and Gust and Twister have doubled power when used against it. If the user is holding a Power Herb, the move completes in one turn.",

    type: "flying",
    category: "physical",

    power: 90,
    accuracy: 95,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "charge",
      invulnerable: true,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "peck",
    name: "Peck",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "flying",
    category: "physical",

    power: 35,
    accuracy: 100,
    maxPp: 35,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "drill-peck",
    name: "Drill Peck",
    generation: 1,
    introducedGeneration: 1,
    description: "No additional effect.",

    type: "flying",
    category: "physical",

    power: 80,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "mirror-move",
    name: "Mirror Move",
    generation: 1,
    introducedGeneration: 1,
    description: "The user uses the last move used by the target. The copied move is used against that target, if possible. Fails if the target has not made a move, or if the last move used cannot be copied by this move.",

    type: "flying",
    category: "status",

    power: null,
    accuracy: null,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "copy-move" },

    flags: [],

    implementationStatus: "data-only",
  },

  {
    id: "sky-attack",
    name: "Sky Attack",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to make the target flinch and a higher chance for a critical hit. This attack charges on the first turn and executes on the second. If the user is holding a Power Herb, the move completes in one turn.",

    type: "flying",
    category: "physical",

    power: 140,
    accuracy: 90,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "charge",
      invulnerable: false,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
