import type { Move } from "../../types/move.types.ts";

// Fire-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_FIRE_MOVES: Move[] = [
  {
    id: "burning-jealousy",
    name: "Burning Jealousy",
    generation: 8,
    introducedGeneration: 8,
    description: "The user attacks with energy from jealousy. This move burns any target that had its stat raised this turn in the source games — this project cannot track that condition, so the burn is applied unconditionally instead.",
    type: "fire",
    category: "special",
    power: 70,
    accuracy: 100,
    maxPp: 5,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage-with-status-chance", status: "burn", chancePercent: 100 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "pyro-ball",
    name: "Pyro Ball",
    generation: 8,
    introducedGeneration: 8,
    description: "The user attacks by igniting a small stone and launching it as a fiery ball at the target. This may also leave the target with a burn.",
    type: "fire",
    category: "physical",
    power: 120,
    accuracy: 90,
    maxPp: 5,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "burn", chancePercent: 10 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
