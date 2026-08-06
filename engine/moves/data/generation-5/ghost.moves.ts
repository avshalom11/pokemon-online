// Ghost-type moves introduced in Generation 5.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_5_GHOST_MOVES: Move[] = [
  {
    id: "hex",
    name: "Hex",
    generation: 5,
    introducedGeneration: 5,
    description: "This relentless attack does massive damage to a target affected by a status condition. This project has no dynamic status-based power scaling, so a flat power is used instead.",
    type: "ghost",
    category: "special",
    power: 65,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
