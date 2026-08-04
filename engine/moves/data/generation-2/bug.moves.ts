// Bug-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_BUG_MOVES: Move[] = [
  {
    id: "silver-wind",
    name: "Silver Wind",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A powder-scattering attack. Has a 10% chance to raise all of the user's own stats by one stage in the original games; simplified here to plain damage for the same self-buff-on-damage reason as Metal Claw (engine/moves/data/generation-2/steel.moves.ts).",

    type: "bug",
    category: "special",

    power: 60,
    accuracy: 100,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
