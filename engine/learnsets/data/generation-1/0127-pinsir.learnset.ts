import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Pinsir (#0127) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PINSIR_LEARNSET: PokemonLearnset = {
  pokemonId: "pinsir",
  generation: 1,
  entries: [
    { moveId: "harden", method: { kind: "level-up", level: 1 } },
    { moveId: "vise-grip", method: { kind: "level-up", level: 1 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 4 } },
    { moveId: "bind", method: { kind: "level-up", level: 8 } },
    { moveId: "seismic-toss", method: { kind: "level-up", level: 12 } },
    { moveId: "strength", method: { kind: "level-up", level: 36 } },
    { moveId: "swords-dance", method: { kind: "level-up", level: 40 } },
    { moveId: "thrash", method: { kind: "level-up", level: 43 } },
    { moveId: "submission", method: { kind: "level-up", level: 44 } },
    { moveId: "guillotine", method: { kind: "level-up", level: 48 } },
  ],
};
