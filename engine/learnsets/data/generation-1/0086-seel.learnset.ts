import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Seel (#0086) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SEEL_LEARNSET: PokemonLearnset = {
  pokemonId: "seel",
  generation: 1,
  entries: [
    { moveId: "headbutt", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 3 } },
    { moveId: "rest", method: { kind: "level-up", level: 21 } },
    { moveId: "aurora-beam", method: { kind: "level-up", level: 27 } },
    { moveId: "take-down", method: { kind: "level-up", level: 37 } },
    { moveId: "ice-beam", method: { kind: "level-up", level: 47 } },
  ],
};
