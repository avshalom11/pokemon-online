import type { Move } from "../../types/move.types.ts";

// Water-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_WATER_MOVES: Move[] = [
  {
    id: "chilling-water",
    name: "Chilling Water",
    generation: 9,
    introducedGeneration: 9,
    description: "The user attacks the target with water so cold it saps its power, always lowering the target's Attack by one stage.",
    type: "water",
    category: "special",
    power: 50,
    accuracy: 100,
    maxPp: 20,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "attack", stages: -1 }], chancePercent: 100 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
