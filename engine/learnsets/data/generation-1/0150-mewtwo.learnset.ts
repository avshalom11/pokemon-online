import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Mewtwo (#0150) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MEWTWO_LEARNSET: PokemonLearnset = {
  pokemonId: "mewtwo",
  generation: 1,
  entries: [
    { moveId: "confusion", method: { kind: "level-up", level: 1 } },
    { moveId: "disable", method: { kind: "level-up", level: 1 } },
    { moveId: "psywave", method: { kind: "level-up", level: 1 } },
    { moveId: "swift", method: { kind: "level-up", level: 1 } },
    { moveId: "amnesia", method: { kind: "level-up", level: 32 } },
    { moveId: "psychic", method: { kind: "level-up", level: 48 } },
    { moveId: "barrier", method: { kind: "level-up", level: 64 } },
    { moveId: "mist", method: { kind: "level-up", level: 64 } },
    { moveId: "recover", method: { kind: "level-up", level: 80 } },
  ],
};
