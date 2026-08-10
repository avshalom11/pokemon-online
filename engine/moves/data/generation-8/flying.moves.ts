import type { Move } from "../../types/move.types.ts";

// Flying-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_FLYING_MOVES: Move[] = [
  {
    id: "dual-wingbeat",
    name: "Dual Wingbeat",
    generation: 8,
    introducedGeneration: 8,
    description: "The user slams the target with its wings, striking it twice in a row.",
    type: "flying",
    category: "physical",
    power: 40,
    accuracy: 90,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "multi-hit", minHits: 2, maxHits: 2 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
