// Poison-type moves introduced in Generation 3.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_3_POISON_MOVES: Move[] = [
  {
    id: "poison-fang",
    name: "Poison Fang",
    generation: 3,
    introducedGeneration: 3,
    description: "The user bites the target with poisonous fangs, which may badly poison it.",
    type: "poison",
    category: "physical",
    power: 50,
    accuracy: 100,
    maxPp: 15,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "badly-poisoned", chancePercent: 50 },
    flags: ["makesContact", "protectable", "mirrorMove", "biting"],
    implementationStatus: "data-only",
  },
  {
    id: "poison-tail",
    name: "Poison Tail",
    generation: 3,
    introducedGeneration: 3,
    description: "The user hits the target with its tail, which may also poison it. This move also has a high critical-hit ratio, which isn't separately modeled.",
    type: "poison",
    category: "physical",
    power: 50,
    accuracy: 100,
    maxPp: 25,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "poison", chancePercent: 10 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
