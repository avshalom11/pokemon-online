// Fighting-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_FIGHTING_MOVES: Move[] = [
  {
    id: "karate-chop",
    name: "Karate Chop",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a higher chance for a critical hit.",

    type: "fighting",
    category: "physical",

    power: 50,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "double-kick",
    name: "Double Kick",
    generation: 1,
    introducedGeneration: 1,
    description: "Hits twice. If the first hit breaks the target's substitute, it will take damage for the second hit.",

    type: "fighting",
    category: "physical",

    power: 30,
    accuracy: 100,
    maxPp: 30,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "multi-hit",
      minHits: 2,
      maxHits: 2,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "jump-kick",
    name: "Jump Kick",
    generation: 1,
    introducedGeneration: 1,
    description: "If this attack is not successful, the user loses half of its maximum HP, rounded down, as crash damage. Pokemon with the Magic Guard Ability are unaffected by crash damage.",

    type: "fighting",
    category: "physical",

    power: 100,
    accuracy: 95,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "rolling-kick",
    name: "Rolling Kick",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to make the target flinch.",

    type: "fighting",
    category: "physical",

    power: 60,
    accuracy: 85,
    maxPp: 15,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 30,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "submission",
    name: "Submission",
    generation: 1,
    introducedGeneration: 1,
    description: "If the target lost HP, the user takes recoil damage equal to 1/4 the HP lost by the target, rounded half up, but not less than 1 HP.",

    type: "fighting",
    category: "physical",

    power: 80,
    accuracy: 80,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "recoil",
      recoilPercent: 25,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "low-kick",
    name: "Low Kick",
    generation: 1,
    introducedGeneration: 1,
    description: "This move's power is 20 if the target weighs less than 10 kg, 40 if less than 25 kg, 60 if less than 50 kg, 80 if less than 100 kg, 100 if less than 200 kg, and 120 if greater than or equal to 200 kg.",

    type: "fighting",
    category: "physical",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "weight-based-damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "counter",
    name: "Counter",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the last opposing Pokemon to hit the user with a physical attack this turn equal to twice the HP lost by the user from that attack. If the user did not lose HP from the attack, this move deals 1 HP of damage instead. If that opposing Pokemon's position is no longer in use and there is another opposing Pokemon on the field, the damage is done to it instead. Only the last hit of a multi-hit attack is counted. Fails if the user was not hit by an opposing Pokemon's physical attack this turn.",

    type: "fighting",
    category: "physical",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: -5,

    target: "opponent",

    effect: {
      kind: "counter",
      category: "physical",
    },

    flags: ["makesContact", "protectable"],

    implementationStatus: "data-only",
  },

  {
    id: "seismic-toss",
    name: "Seismic Toss",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals damage to the target equal to the user's level.",

    type: "fighting",
    category: "physical",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "fixed-damage",
      damage: {
        basis: "level",
      },
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "high-jump-kick",
    name: "High Jump Kick",
    generation: 1,
    introducedGeneration: 1,
    description: "If this attack is not successful, the user loses half of its maximum HP, rounded down, as crash damage. Pokemon with the Magic Guard Ability are unaffected by crash damage.",

    type: "fighting",
    category: "physical",

    power: 130,
    accuracy: 90,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
