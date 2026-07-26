import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Wigglytuff (#0040) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const WIGGLYTUFF_LEARNSET: PokemonLearnset = {
  pokemonId: "wigglytuff",
  generation: 1,
  entries: [
    { moveId: "body-slam", method: { kind: "level-up", level: 1 } },
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "disable", method: { kind: "level-up", level: 1 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 1 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 1 } },
    { moveId: "mimic", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "rest", method: { kind: "level-up", level: 1 } },
    { moveId: "sing", method: { kind: "level-up", level: 1 } },
  ],
};
