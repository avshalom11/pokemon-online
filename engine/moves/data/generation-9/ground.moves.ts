import type { Move } from "../../types/move.types.ts";

// Ground-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_GROUND_MOVES: Move[] = [
  {
    id: "sandsear-storm",
    name: "Sandsear Storm",
    generation: 9,
    introducedGeneration: 9,
    description: "The user attacks by wrapping opposing Pokémon in fierce winds and searing sand, which may leave them burned. This move never misses in rain in the source games — this project has no weather-accuracy mechanic yet, so it uses its own flat accuracy instead.",
    type: "ground",
    category: "special",
    power: 100,
    accuracy: 80,
    maxPp: 10,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage-with-status-chance", status: "burn", chancePercent: 20 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
