import type { Move } from "../../types/move.types.ts";

export const GENERATION_6_ICE_MOVES: Move[] = [
  {
    id: "freeze-dry",
    name: "Freeze-Dry",
    generation: 6,
    introducedGeneration: 6,
    description: "The user rapidly cools the target, which may freeze it. This move is super effective against Water types in the original games — a type-chart exception this project doesn't model.",
    type: "ice",
    category: "special",
    power: 70,
    accuracy: 100,
    maxPp: 20,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "freeze", chancePercent: 10 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
