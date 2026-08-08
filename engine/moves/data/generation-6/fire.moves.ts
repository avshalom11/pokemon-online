import type { Move } from "../../types/move.types.ts";

export const GENERATION_6_FIRE_MOVES: Move[] = [
  {
    id: "mystical-fire",
    name: "Mystical Fire",
    generation: 6,
    introducedGeneration: 6,
    description: "The user attacks by breathing a special, hot fire, lowering the target's Special Attack.",
    type: "fire",
    category: "special",
    power: 65,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "specialAttack", stages: -1 }], chancePercent: 100 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
