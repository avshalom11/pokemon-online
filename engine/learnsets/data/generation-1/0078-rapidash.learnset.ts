import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Rapidash (#0078) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const RAPIDASH_LEARNSET: PokemonLearnset = {
  pokemonId: "rapidash",
  generation: 1,
  entries: [
    { moveId: "ember", method: { kind: "level-up", level: 1 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "agility", method: { kind: "level-up", level: 20 } },
    { moveId: "stomp", method: { kind: "level-up", level: 30 } },
    { moveId: "fire-spin", method: { kind: "level-up", level: 35 } },
    { moveId: "take-down", method: { kind: "level-up", level: 43 } },
    { moveId: "fire-blast", method: { kind: "level-up", level: 56 } },
  ],
};
