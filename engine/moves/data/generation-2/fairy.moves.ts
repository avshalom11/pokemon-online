// Fairy-type moves. Fairy did not exist as a playable type until Generation
// 6 — Charm's modern type is Fairy (it was Normal at its Generation 2
// debut), so it's filed here under its current/modern type, the same
// "modern type convention" precedent engine/moves/data/generation-1/
// dark.moves.ts already established for Bite (Normal -> Dark).
import type { Move } from "../../types/move.types.ts";

export const GENERATION_2_FAIRY_MOVES: Move[] = [
  {
    id: "charm",
    name: "Charm",
    generation: 2,
    introducedGeneration: 2,
    description: "The user endears itself to the target, harshly lowering its Attack by two stages.",

    type: "fairy",
    category: "status",

    power: null,
    accuracy: 100,
    maxPp: 20,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "stat-change",
      changes: [{ stat: "attack", stages: -2 }],
    },

    flags: ["protectable", "mirrorMove"],

    implementationStatus: "data-only",
  },
];
