// Dark-type moves introduced in Generation 1.
//
// Dark wasn't a playable type until Generation 2 — Bite is the one
// Generation 1 move whose *modern* type differs from what the original
// games used (it was Normal-type at launch, retyped to Dark when the type
// was introduced). This file exists so Bite's data lives with moves that
// share its current, canonical type, matching every other type-split file
// here — see the file-structure note in data/index.ts for why this file
// isn't in the phase spec's original list.
import type { Move } from "../../types/move.types.ts";

export const GENERATION_1_DARK_MOVES: Move[] = [
  {
    id: "bite",
    name: "Bite",
    generation: 1,
    introducedGeneration: 1,
    description: "Has a 30% chance to make the target flinch.",

    type: "dark",
    category: "physical",

    power: 60,
    accuracy: 100,
    maxPp: 25,

    priority: 0,

    target: "opponent",

    effect: {
      kind: "damage-with-status-chance",
      status: "flinch",
      chancePercent: 30,
    },

    flags: ["makesContact", "protectable", "mirrorMove", "biting"],

    implementationStatus: "data-only",
  },
];
