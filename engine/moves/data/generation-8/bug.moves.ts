import type { Move } from "../../types/move.types.ts";

// Bug-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_BUG_MOVES: Move[] = [
  {
    id: "skitter-smack",
    name: "Skitter Smack",
    generation: 8,
    introducedGeneration: 8,
    description: "The user skitters behind the target to attack, always lowering the target's Sp. Atk stat.",
    type: "bug",
    category: "physical",
    power: 70,
    accuracy: 90,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "specialAttack", stages: -1 }], chancePercent: 100 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
