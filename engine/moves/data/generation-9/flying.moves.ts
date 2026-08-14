import type { Move } from "../../types/move.types.ts";

// Flying-type moves genuinely introduced in Generation 9 (Scarlet/Violet).
export const GENERATION_9_FLYING_MOVES: Move[] = [
  {
    id: "bleakwind-storm",
    name: "Bleakwind Storm",
    generation: 9,
    introducedGeneration: 9,
    description: "The user attacks with savage, cold winds, which may lower the Speed of every opposing Pokémon. This move never misses in rain in the source games — this project has no weather-accuracy mechanic yet, so it uses its own flat accuracy instead.",
    type: "flying",
    category: "special",
    power: 100,
    accuracy: 80,
    maxPp: 10,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "speed", stages: -1 }], chancePercent: 20 },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
