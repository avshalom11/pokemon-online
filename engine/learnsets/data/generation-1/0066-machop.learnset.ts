import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Machop (#0066) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MACHOP_LEARNSET: PokemonLearnset = {
  pokemonId: "machop",
  generation: 1,
  entries: [
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "low-kick", method: { kind: "level-up", level: 1 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 4 } },
    { moveId: "karate-chop", method: { kind: "level-up", level: 7 } },
    { moveId: "strength", method: { kind: "level-up", level: 29 } },
    { moveId: "submission", method: { kind: "level-up", level: 33 } },
    { moveId: "seismic-toss", method: { kind: "level-up", level: 40 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 52 } },
  ],
};
