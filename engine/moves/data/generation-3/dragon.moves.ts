// Dragon-type moves introduced in Generation 3.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_3_DRAGON_MOVES: Move[] = [
  {
    id: "dragon-claw",
    name: "Dragon Claw",
    generation: 3,
    introducedGeneration: 3,
    description: "The user slashes the target with huge, sharp claws.",
    type: "dragon",
    category: "physical",
    power: 80,
    accuracy: 100,
    maxPp: 15,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "dragon-dance",
    name: "Dragon Dance",
    generation: 3,
    introducedGeneration: 3,
    description: "The user performs a mystic, powerful dance that raises its Attack and Speed stats.",
    type: "dragon",
    category: "status",
    power: null,
    accuracy: null,
    maxPp: 20,
    priority: 0,
    target: "self",
    effect: { kind: "stat-change", changes: [{ stat: "attack", stages: 1 }, { stat: "speed", stages: 1 }] },
    flags: [],
    implementationStatus: "data-only",
  },
];
