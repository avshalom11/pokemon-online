import type { Move } from "../../types/move.types.ts";

// Bug-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_BUG_MOVES: Move[] = [
  {
    id: "silk-trap",
    name: "Silk Trap",
    generation: 9,
    introducedGeneration: 9,
    description: "The user spins a protective barrier of silk, blocking the opponent's move this turn. In the source games any attacker that makes direct contact also has its Speed lowered by one stage — this project has no on-contact-retaliation mechanic yet, so only the protection itself is kept.",
    type: "bug",
    category: "status",
    power: null,
    accuracy: null,
    maxPp: 10,
    priority: 4,
    target: "self",
    effect: { kind: "protect" },
    flags: [],
    implementationStatus: "data-only",
  },
];
