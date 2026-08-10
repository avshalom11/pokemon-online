import type { Move } from "../../types/move.types.ts";

// Rock-type moves genuinely introduced in Generation 8 (Sword/Shield era).
export const GENERATION_8_ROCK_MOVES: Move[] = [
  {
    id: "meteor-beam",
    name: "Meteor Beam",
    generation: 8,
    introducedGeneration: 8,
    description: "In the first turn, the user gathers space power and raises its Sp. Atk stat, then attacks the target on the next turn — the same two-turn charge shape Solar Beam already uses. The Sp. Atk raise on the charging turn isn't modeled, same simplification as Solar Blade.",
    type: "rock",
    category: "special",
    power: 120,
    accuracy: 90,
    maxPp: 10,
    priority: 0,
    target: "opponent",
    effect: { kind: "charge", invulnerable: false },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
  {
    id: "tar-shot",
    name: "Tar Shot",
    generation: 8,
    introducedGeneration: 8,
    description: "The user pours sticky tar over the target, lowering its Speed stat. This also makes the target weaker to Fire-type moves in the source games — this project has no per-Pokémon type-weakness-modifier mechanic, so only the Speed drop is applied.",
    type: "rock",
    category: "status",
    power: null,
    accuracy: 100,
    maxPp: 15,
    priority: 0,
    target: "opponent",
    effect: { kind: "stat-change", changes: [{ stat: "speed", stages: -1 }] },
    flags: ["protectable", "mirrorMove"],
    implementationStatus: "data-only",
  },
];
