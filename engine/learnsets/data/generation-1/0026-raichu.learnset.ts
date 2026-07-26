import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Raichu (#0026) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const RAICHU_LEARNSET: PokemonLearnset = {
  pokemonId: "raichu",
  generation: 1,
  entries: [
    { moveId: "agility", method: { kind: "level-up", level: 1 } },
    { moveId: "double-team", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "slam", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-punch", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-wave", method: { kind: "level-up", level: 1 } },
    { moveId: "thunderbolt", method: { kind: "level-up", level: 5 } },
  ],
};
