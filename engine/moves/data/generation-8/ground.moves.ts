import type { Move } from "../../types/move.types.ts";

// Ground-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_GROUND_MOVES: Move[] = [
  {
    id: "scorching-sands",
    name: "Scorching Sands",
    generation: 8,
    introducedGeneration: 8,
    description: "The user throws scorching sand at the target. This may also leave the target with a burn.",
    type: "ground",
    category: "special",
    power: 70,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "burn", chancePercent: 30 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
