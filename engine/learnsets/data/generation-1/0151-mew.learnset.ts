import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Mew (#0151) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MEW_LEARNSET: PokemonLearnset = {
  pokemonId: "mew",
  generation: 1,
  entries: [
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "amnesia", method: { kind: "level-up", level: 10 } },
    { moveId: "mega-punch", method: { kind: "level-up", level: 10 } },
    { moveId: "barrier", method: { kind: "level-up", level: 40 } },
    { moveId: "metronome", method: { kind: "level-up", level: 60 } },
    { moveId: "transform", method: { kind: "level-up", level: 80 } },
    { moveId: "psychic", method: { kind: "level-up", level: 100 } },
  ],
};
