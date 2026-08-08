import type { Move } from "../../types/move.types.ts";

export const GENERATION_6_ROCK_MOVES: Move[] = [
  {
    id: "diamond-storm",
    name: "Diamond Storm",
    generation: 6,
    introducedGeneration: 6,
    description: "The user whips up a storm of diamonds. Has a 50% chance to sharply raise the user's own Defense in the original games; simplified here to plain damage — this project's damage-with-stat-change-chance effect only ever applies to the move's target, never the user, on a damaging move (see the existing Metal Claw/Ancient Power convention).",
    type: "rock",
    category: "physical",
    power: 100,
    accuracy: 95,
    maxPp: 5,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage" },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
