import type { Move } from "../../types/move.types.ts";

// Dragon-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_DRAGON_MOVES: Move[] = [
  {
    id: "dragon-cheer",
    name: "Dragon Cheer",
    generation: 9,
    introducedGeneration: 9,
    description: "The user raises its allies' morale, boosting critical-hit rate. In the source games this targets the whole ally side (with an extra bonus for Dragon-type allies) — this project has no multiplayer/ally-targeting system, so it raises only the user's own critical-hit rate.",
    type: "dragon",
    category: "status",
    power: null,
    accuracy: null,
    maxPp: 15,
    priority: 0,
    target: "self",
    effect: { kind: "crit-rate-up" },
    flags: [],
    implementationStatus: "data-only",
  },
  {
    id: "glaive-rush",
    name: "Glaive Rush",
    generation: 9,
    introducedGeneration: 9,
    description: "The user charges recklessly at the target. In the source games attacks against the user cannot miss and deal double damage until the user's next turn — this project has no such self-inflicted vulnerability mechanic, so the drawback is dropped.",
    type: "dragon",
    category: "physical",
    power: 120,
    accuracy: 100,
    maxPp: 5,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
