// Ground-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_GROUND_MOVES: Move[] = [
  {
    id: "sand-attack",
    name: "Sand Attack",
    generation: 1,
    introducedGeneration: 1,
    description: "Lowers the target's accuracy by 1 stage.",

    type: "ground",
    category: "status",

    power: null,
    accuracy: 100,
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
    id: "earthquake",
    name: "Earthquake",
    generation: 1,
    introducedGeneration: 1,
    description: "Damage doubles if the target is using Dig.",

    type: "ground",
    category: "physical",

    power: 100,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "all-pokemon",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "fissure",
    name: "Fissure",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the target equal to the target's maximum HP. Ignores accuracy and evasiveness modifiers. This attack's accuracy is equal to (user's level - target's level + 30)%, and fails if the target is at a higher level. Pokemon with the Sturdy Ability are immune.",

    type: "ground",
    category: "physical",

    power: null,
    accuracy: 30,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "ohko" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "dig",
    name: "Dig",
    generation: 1,
    introducedGeneration: 1,
    description: "This attack charges on the first turn and executes on the second. On the first turn, the user avoids all attacks other than Earthquake and Magnitude but takes double damage from them, and is also unaffected by weather. If the user is holding a Power Herb, the move completes in one turn.",

    type: "ground",
    category: "physical",

    power: 80,
    accuracy: 100,
    maxPp: 10,

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
    id: "bone-club",
    name: "Bone Club",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 10% chance to make the target flinch.",

    type: "ground",
    category: "physical",

    power: 65,
    accuracy: 85,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 10,
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "bonemerang",
    name: "Bonemerang",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits twice. If the first hit breaks the target's substitute, it will take damage for the second hit.",

    type: "ground",
    category: "physical",

    power: 50,
    accuracy: 90,
    maxPp: 10,

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
];
