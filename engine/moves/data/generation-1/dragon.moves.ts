// Dragon-type moves introduced in Generation 1.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_DRAGON_MOVES: Move[] = [
  {
    id: "dragon-rage",
    name: "Dragon Rage",
    generation: 1,
    introducedGeneration: 1,
    description: "Deals 40 HP of damage to the target.",

    type: "dragon",
    category: "special",

    power: null,
    accuracy: 100,
    maxPp: 10,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "fixed-damage",
      damage: {
        basis: "set-amount",
        amount: 40,
      },
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
