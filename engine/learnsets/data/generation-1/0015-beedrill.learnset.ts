import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Beedrill (#0015) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const BEEDRILL_LEARNSET: PokemonLearnset = {
  pokemonId: "beedrill",
  generation: 1,
  entries: [
    { moveId: "fury-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "twineedle", method: { kind: "level-up", level: 1 } },
    { moveId: "rage", method: { kind: "level-up", level: 14 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 20 } },
    { moveId: "pin-missile", method: { kind: "level-up", level: 32 } },
    { moveId: "agility", method: { kind: "level-up", level: 38 } },
  ],
};
