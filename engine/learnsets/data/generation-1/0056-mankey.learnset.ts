import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Mankey (#0056) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MANKEY_LEARNSET: PokemonLearnset = {
  pokemonId: "mankey",
  generation: 1,
  entries: [
    { moveId: "focus-energy", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 5 } },
    { moveId: "karate-chop", method: { kind: "level-up", level: 8 } },
    { moveId: "low-kick", method: { kind: "level-up", level: 8 } },
    { moveId: "seismic-toss", method: { kind: "level-up", level: 12 } },
    { moveId: "thrash", method: { kind: "level-up", level: 29 } },
    { moveId: "screech", method: { kind: "level-up", level: 36 } },
  ],
};
