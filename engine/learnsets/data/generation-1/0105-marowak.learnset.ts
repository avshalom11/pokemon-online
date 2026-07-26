import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Marowak (#0105) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MAROWAK_LEARNSET: PokemonLearnset = {
  pokemonId: "marowak",
  generation: 1,
  entries: [
    { moveId: "bone-club", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "headbutt", method: { kind: "level-up", level: 12 } },
    { moveId: "leer", method: { kind: "level-up", level: 13 } },
    { moveId: "rage", method: { kind: "level-up", level: 23 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 36 } },
    { moveId: "bonemerang", method: { kind: "level-up", level: 48 } },
    { moveId: "thrash", method: { kind: "level-up", level: 54 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 60 } },
  ],
};
