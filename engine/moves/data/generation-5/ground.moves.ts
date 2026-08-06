// Ground-type moves introduced in Generation 5.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_5_GROUND_MOVES: Move[] = [
  {
    id: "bulldoze",
    name: "Bulldoze",
    generation: 5,
    introducedGeneration: 5,
    description: "The user stomps down on the ground and attacks everything in the area. This lowers the Speed stat of those hit.",
    type: "ground",
    category: "physical",
    power: 60,
    accuracy: 100,
    maxPp: 20,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "speed", stages: -1 }], chancePercent: 100 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
