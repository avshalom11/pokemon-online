// Water-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_WATER_MOVES: Move[] = [
  {
    id: "whirlpool",
    name: "Whirlpool",
    generation: 2,
    introducedGeneration: 2,
    description:
      "Traps the target in a swirling current for several turns, dealing damage each turn. Reuses the same \"partial-trap\" effect kind Generation 1's Wrap/Bind/Fire Spin/Clamp already use for this exact mechanic.",

    type: "water",
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
];
