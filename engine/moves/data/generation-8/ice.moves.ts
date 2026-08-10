import type { Move } from "../../types/move.types.ts";

// Ice-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_ICE_MOVES: Move[] = [
  {
    id: "glacial-lance",
    name: "Glacial Lance",
    generation: 8,
    introducedGeneration: 8,
    description: "The user attacks by hurling a blizzard-cloaked icicle lance at opposing Pokémon.",
    type: "ice",
    category: "physical",
    power: 120,
    accuracy: 100,
    maxPp: 5,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage" },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "triple-axel",
    name: "Triple Axel",
    generation: 8,
    introducedGeneration: 8,
    description: "The user hits the target with a kick three times in a row, with power increasing each hit in the source games — this project's multi-hit mechanic applies the same base power per hit, so the move's first-hit power (20) is used for all three hits.",
    type: "ice",
    category: "physical",
    power: 20,
    accuracy: 90,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "multi-hit", minHits: 3, maxHits: 3 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
