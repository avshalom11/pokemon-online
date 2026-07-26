import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Ditto (#0132) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const DITTO_LEARNSET: PokemonLearnset = {
  pokemonId: "ditto",
  generation: 1,
  entries: [
    { moveId: "transform", method: { kind: "level-up", level: 1 } },
  ],
};
