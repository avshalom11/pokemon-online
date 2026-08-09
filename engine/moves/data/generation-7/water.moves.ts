import type { Move } from "../../types/move.types.ts";

// Water-type moves genuinely introduced in Generation 7.
export const GENERATION_7_WATER_MOVES: Move[] = [
  {
    id: "sparkling-aria",
    name: "Sparkling Aria",
    generation: 7,
    introducedGeneration: 7,
    description: "The user bursts into song, emitting many bubbles, hitting every surrounding Pokémon. Any target hit that is burned has its burn cured — that cure-on-hit side effect isn't modeled here; registered as plain damage.",
    type: "water",
    category: "special",
    power: 90,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "all-opponents",
    effect: { kind: "damage" },
    flags: ["protectable", "mirrorMove", "soundBased"],
    implementationStatus: "data-only",
  },
  {
    id: "liquidation",
    name: "Liquidation",
    generation: 7,
    introducedGeneration: 7,
    description: "The user slams into the target using a full-force blast of water, which may also lower the target's Defense stat.",
    type: "water",
    category: "physical",
    power: 85,
    accuracy: 100,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "damage-with-stat-change-chance", changes: [{ stat: "defense", stages: -1 }], chancePercent: 20 },
    flags: ["makesContact", "protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
