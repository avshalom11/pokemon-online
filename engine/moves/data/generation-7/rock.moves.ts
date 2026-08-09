import type { Move } from "../../types/move.types.ts";

// Rock-type moves genuinely introduced in Generation 7.
export const GENERATION_7_ROCK_MOVES: Move[] = [
  {
    id: "accelerock",
    name: "Accelerock",
    generation: 7,
    introducedGeneration: 7,
    description: "The user smashes into the target at high speed. This move always goes first.",
    type: "rock",
    category: "physical",
    power: 40,
    accuracy: 100,
    maxPp: 20,
    priority: 1,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
