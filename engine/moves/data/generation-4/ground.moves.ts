// Ground-type moves introduced in Generation 4.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_4_GROUND_MOVES: Move[] = [
  {
    id: "earth-power",
    name: "Earth Power",
    generation: 4,
    introducedGeneration: 4,
    description: "The user makes the ground under the target erupt with power. It may also lower the target's Special Defense.",
    type: "ground",
    category: "special",
    power: 90,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "specialDefense", stages: -1 }], chancePercent: 10 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "mud-bomb",
    name: "Mud Bomb",
    generation: 4,
    introducedGeneration: 4,
    description: "The user launches a hard-packed mud ball to attack. It may also lower the target's accuracy.",
    type: "ground",
    category: "special",
    power: 65,
    accuracy: 85,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "accuracy", stages: -1 }], chancePercent: 30 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
