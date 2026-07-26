import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Dewgong (#0087) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const DEWGONG_LEARNSET: PokemonLearnset = {
  pokemonId: "dewgong",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "headbutt", method: { kind: "level-up", level: 1 } },
    { moveId: "rest", method: { kind: "level-up", level: 21 } },
    { moveId: "aurora-beam", method: { kind: "level-up", level: 27 } },
    { moveId: "take-down", method: { kind: "level-up", level: 39 } },
    { moveId: "ice-beam", method: { kind: "level-up", level: 55 } },
  ],
};
