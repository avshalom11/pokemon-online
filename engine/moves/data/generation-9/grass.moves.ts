import type { Move } from "../../types/move.types.ts";

// Grass-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_GRASS_MOVES: Move[] = [
  {
    id: "trailblaze",
    name: "Trailblaze",
    generation: 9,
    introducedGeneration: 9,
    description: "The user attacks with nimble footwork, then its own Speed is raised by one stage.",
    type: "grass",
    category: "physical",
    power: 50,
    accuracy: 100,
    maxPp: 20,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "speed", stages: 1 }], chancePercent: 100 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "ivy-cudgel",
    name: "Ivy Cudgel",
    generation: 9,
    introducedGeneration: 9,
    description: "The user strikes with an ivy-wrapped club. In the source games this move's type changes to match the mask Ogerpon is wearing and has a boosted critical-hit rate — this project has no mask-form/type-change mechanic (same simplification precedent as Tera Blast), so this is a fixed Grass-type attack with no crit bonus.",
    type: "grass",
    category: "physical",
    power: 100,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
