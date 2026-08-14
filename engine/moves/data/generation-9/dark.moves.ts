import type { Move } from "../../types/move.types.ts";

// Dark-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_DARK_MOVES: Move[] = [
  {
    id: "ruination",
    name: "Ruination",
    generation: 9,
    introducedGeneration: 9,
    description: "The user summons a ruinous, ominous cloud, dealing damage equal to half of the target's current HP.",
    type: "dark",
    category: "special",
    power: null,
    accuracy: 90,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "current-hp-percent-damage", percent: 50 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
