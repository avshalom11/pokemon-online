import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Kangaskhan (#0115) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const KANGASKHAN_LEARNSET: PokemonLearnset = {
  pokemonId: "kangaskhan",
  generation: 1,
  entries: [
    { moveId: "comet-punch", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 4 } },
    { moveId: "bite", method: { kind: "level-up", level: 12 } },
    { moveId: "stomp", method: { kind: "level-up", level: 16 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 20 } },
    { moveId: "rage", method: { kind: "level-up", level: 22 } },
    { moveId: "headbutt", method: { kind: "level-up", level: 24 } },
    { moveId: "mega-punch", method: { kind: "level-up", level: 25 } },
    { moveId: "dizzy-punch", method: { kind: "level-up", level: 34 } },
  ],
};
