import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Geodude (#0074) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const GEODUDE_LEARNSET: PokemonLearnset = {
  pokemonId: "geodude",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "rock-throw", method: { kind: "level-up", level: 16 } },
    { moveId: "self-destruct", method: { kind: "level-up", level: 24 } },
    { moveId: "earthquake", method: { kind: "level-up", level: 34 } },
    { moveId: "explosion", method: { kind: "level-up", level: 36 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 40 } },
  ],
};
