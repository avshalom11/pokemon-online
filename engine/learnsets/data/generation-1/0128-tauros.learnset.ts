import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Tauros (#0128) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const TAUROS_LEARNSET: PokemonLearnset = {
  pokemonId: "tauros",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "rage", method: { kind: "level-up", level: 5 } },
    { moveId: "horn-attack", method: { kind: "level-up", level: 20 } },
    { moveId: "take-down", method: { kind: "level-up", level: 35 } },
    { moveId: "rest", method: { kind: "level-up", level: 40 } },
    { moveId: "thrash", method: { kind: "level-up", level: 50 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 55 } },
  ],
};
