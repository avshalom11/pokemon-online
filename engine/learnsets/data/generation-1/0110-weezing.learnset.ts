import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Weezing (#0110) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const WEEZING_LEARNSET: PokemonLearnset = {
  pokemonId: "weezing",
  generation: 1,
  entries: [
    { moveId: "poison-gas", method: { kind: "level-up", level: 1 } },
    { moveId: "smog", method: { kind: "level-up", level: 1 } },
    { moveId: "smokescreen", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "sludge", method: { kind: "level-up", level: 20 } },
    { moveId: "haze", method: { kind: "level-up", level: 24 } },
    { moveId: "self-destruct", method: { kind: "level-up", level: 28 } },
    { moveId: "toxic", method: { kind: "level-up", level: 38 } },
    { moveId: "explosion", method: { kind: "level-up", level: 50 } },
  ],
};
