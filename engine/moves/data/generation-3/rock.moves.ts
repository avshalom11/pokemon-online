// Rock-type moves introduced in Generation 3.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_3_ROCK_MOVES: Move[] = [
  {
    id: "rock-tomb",
    name: "Rock Tomb",
    generation: 3,
    introducedGeneration: 3,
    description: "The user throws boulders at the target, lowering its Speed by preventing its movement.",
    type: "rock",
    category: "physical",
    power: 50,
    accuracy: 80,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "speed", stages: -1 }], chancePercent: 100 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "rock-blast",
    name: "Rock Blast",
    generation: 3,
    introducedGeneration: 3,
    description: "The user hurls hard rocks at the target, hitting it two to five times in a row.",
    type: "rock",
    category: "physical",
    power: 25,
    accuracy: 90,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "multi-hit", minHits: 2, maxHits: 5 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
