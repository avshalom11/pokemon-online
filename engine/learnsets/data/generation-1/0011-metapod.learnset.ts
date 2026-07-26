import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Metapod (#0011) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const METAPOD_LEARNSET: PokemonLearnset = {
  pokemonId: "metapod",
  generation: 1,
  entries: [
    { moveId: "harden", method: { kind: "level-up", level: 1 } },
  ],
};
