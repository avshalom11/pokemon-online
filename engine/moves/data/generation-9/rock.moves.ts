import type { Move } from "../../types/move.types.ts";

// Rock-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_ROCK_MOVES: Move[] = [
  {
    id: "salt-cure",
    name: "Salt Cure",
    generation: 9,
    introducedGeneration: 9,
    description: "The user attacks the target with a coating of salt. In the source games this also inflicts residual damage every turn afterward (doubled against Steel/Water types) — this project has no residual-damage-condition mechanic yet, so only the direct hit is kept.",
    type: "rock",
    category: "physical",
    power: 40,
    accuracy: 100,
    maxPp: 15,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
