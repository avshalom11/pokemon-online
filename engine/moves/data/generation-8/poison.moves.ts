import type { Move } from "../../types/move.types.ts";

// Poison-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_POISON_MOVES: Move[] = [
  {
    id: "corrosive-gas",
    name: "Corrosive Gas",
    generation: 8,
    introducedGeneration: 8,
    description: "The user surrounds everything around it with highly acidic gas, melting away the held items of every other Pokémon on the field. This project has no item-destruction mechanic, so this is data-only with no effect.",
    type: "poison",
    category: "status",
    power: null,
    accuracy: 100,
    maxPp: 40,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "no-effect" },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "shell-side-arm",
    name: "Shell Side Arm",
    generation: 8,
    introducedGeneration: 8,
    description: "This move inflicts physical or special damage, whichever will be more effective, in the source games — this project's damage formula has no per-move category-switching, so it always resolves as a special attack. May also poison the target.",
    type: "poison",
    category: "special",
    power: 90,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "poison", chancePercent: 20 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
