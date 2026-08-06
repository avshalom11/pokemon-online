// Rock-type moves introduced in Generation 5.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_5_ROCK_MOVES: Move[] = [
  {
    id: "wide-guard",
    name: "Wide Guard",
    generation: 5,
    introducedGeneration: 5,
    description: "The user and its allies are protected from wide-ranging attacks for one turn. This project has no team-wide/multi-target-specific protection mechanic, so this is approximated using the same generic protect effect as Protect/Detect.",
    type: "rock",
    category: "status",
    power: null,
    accuracy: null,
    maxPp: 10,
    priority: 3,
    target: "self",
    effect: { kind: "protect" },
    flags: [],
    implementationStatus: "data-only",
  },
];
