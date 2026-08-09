import type { Move } from "../../types/move.types.ts";

// Flying-type moves genuinely introduced in Generation 7.
export const GENERATION_7_FLYING_MOVES: Move[] = [
  {
    id: "beak-blast",
    name: "Beak Blast",
    generation: 7,
    introducedGeneration: 7,
    description: "The user heats up its beak before attacking — any Pokémon that makes contact with it during that window gets burned. The attack itself resolves at the very end of the turn regardless of move order. The burn-on-contact nuance and end-of-turn resolution timing aren't modeled here; registered as an ordinary low-priority attack.",
    type: "flying",
    category: "physical",
    power: 100,
    accuracy: 100,
    maxPp: 15,
    priority: -3,
    target: "opponent",
    effect: { kind: "damage" },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
