// Rock-type moves introduced in Generation 2.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_ROCK_MOVES: Move[] = [
  {
    id: "rollout",
    name: "Rollout",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A rolling attack whose real power doubles on each consecutive turn used (30/60/120/240/480 across five turns). This project's battle engine has no multi-turn power-ramping mechanic, so this move is represented as a flat, single-turn 30-power attack.",

    type: "rock",
    category: "physical",

    power: 30,
    accuracy: 90,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["makesContact", "protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },

  {
    id: "ancient-power",
    name: "Ancient Power",
    generation: 2,
    introducedGeneration: 2,
    description:
      "A prehistoric-powered attack. Has a 10% chance to raise all of the user's own stats by one stage in the original games; simplified here to plain damage for the same self-buff-on-damage reason as Metal Claw (engine/moves/data/generation-2/steel.moves.ts).",

    type: "rock",
    category: "special",

    power: 60,
    accuracy: 100,
    maxPp: 5,

    priority: 0,

    target: "opponent",

    effect: { kind: "damage" },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
