import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Machoke (#0067) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MACHOKE_LEARNSET: PokemonLearnset = {
  pokemonId: "machoke",
  generation: 1,
  entries: [
    { moveId: "focus-energy", method: { kind: "level-up", level: 1 } },
    { moveId: "karate-chop", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "low-kick", method: { kind: "level-up", level: 1 } },
    { moveId: "strength", method: { kind: "level-up", level: 31 } },
    { moveId: "submission", method: { kind: "level-up", level: 37 } },
    { moveId: "seismic-toss", method: { kind: "level-up", level: 48 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 66 } },
  ],
};
