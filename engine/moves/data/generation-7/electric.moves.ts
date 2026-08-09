import type { Move } from "../../types/move.types.ts";

// Electric-type moves genuinely introduced in Generation 7.
export const GENERATION_7_ELECTRIC_MOVES: Move[] = [
  {
    id: "zing-zap",
    name: "Zing Zap",
    generation: 7,
    introducedGeneration: 7,
    description: "A strong electric blast crashes down on the target, giving it an electric shock. This may also make the target flinch.",
    type: "electric",
    category: "physical",
    power: 80,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "flinch", chancePercent: 30 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "plasma-fists",
    name: "Plasma Fists",
    generation: 7,
    introducedGeneration: 7,
    description: "The user attacks the target with electrically charged fists. This causes Normal-type moves to become Electric-type moves for the rest of the turn — that field-wide type-conversion side effect isn't modeled here; registered as plain damage.",
    type: "electric",
    category: "physical",
    power: 100,
    accuracy: 100,
    maxPp: 15,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["makesContact", "protectable", "mirrorMove", "punching"],
    implementationStatus: "data-only",
  },
];
