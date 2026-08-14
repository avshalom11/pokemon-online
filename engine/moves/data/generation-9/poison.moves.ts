import type { Move } from "../../types/move.types.ts";

// Poison-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_POISON_MOVES: Move[] = [
  {
    id: "mortal-spin",
    name: "Mortal Spin",
    generation: 9,
    introducedGeneration: 9,
    description: "The user attacks with a spin, poisoning every opposing Pokémon it hits. In the source games this also removes hazards and binding-move effects from the user's own side — this project has no hazard-removal mechanic yet, so only the damage/poison chance is kept.",
    type: "poison",
    category: "physical",
    power: 30,
    accuracy: 100,
    maxPp: 15,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage-with-status-chance", status: "poison", chancePercent: 100 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "malignant-chain",
    name: "Malignant Chain",
    generation: 9,
    introducedGeneration: 9,
    description: "The user pours toxins into the target by wrapping them in a toxic, corrosive chain, which may badly poison the target.",
    type: "poison",
    category: "special",
    power: 100,
    accuracy: 100,
    maxPp: 5,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-status-chance", status: "badly-poisoned", chancePercent: 50 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
