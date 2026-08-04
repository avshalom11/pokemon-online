// Fire-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_FIRE_MOVES: Move[] = [
  {
    id: "flame-wheel",
    name: "Flame Wheel",
    generation: 2,
    introducedGeneration: 2,
    description: "The user cloaks itself in fire and charges the target, which may leave it burned.",

    type: "fire",
    category: "physical",

    power: 60,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "burn",
      chancePercent: 10,
    },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
