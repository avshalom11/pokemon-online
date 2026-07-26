import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Jigglypuff (#0039) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const JIGGLYPUFF_LEARNSET: PokemonLearnset = {
  pokemonId: "jigglypuff",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "disable", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "sing", method: { kind: "level-up", level: 1 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 17 } },
    { moveId: "rest", method: { kind: "level-up", level: 20 } },
    { moveId: "body-slam", method: { kind: "level-up", level: 24 } },
    { moveId: "mimic", method: { kind: "level-up", level: 28 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 44 } },
  ],
};
