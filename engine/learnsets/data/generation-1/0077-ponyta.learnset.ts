import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Ponyta (#0077) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PONYTA_LEARNSET: PokemonLearnset = {
  pokemonId: "ponyta",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 5 } },
    { moveId: "ember", method: { kind: "level-up", level: 10 } },
    { moveId: "agility", method: { kind: "level-up", level: 20 } },
    { moveId: "stomp", method: { kind: "level-up", level: 30 } },
    { moveId: "fire-spin", method: { kind: "level-up", level: 35 } },
    { moveId: "take-down", method: { kind: "level-up", level: 41 } },
    { moveId: "fire-blast", method: { kind: "level-up", level: 50 } },
  ],
};
