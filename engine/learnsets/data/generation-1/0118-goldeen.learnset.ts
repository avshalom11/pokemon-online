import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Goldeen (#0118) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const GOLDEEN_LEARNSET: PokemonLearnset = {
  pokemonId: "goldeen",
  generation: 1,
  entries: [
    { moveId: "peck", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 5 } },
    { moveId: "horn-attack", method: { kind: "level-up", level: 15 } },
    { moveId: "agility", method: { kind: "level-up", level: 20 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 24 } },
    { moveId: "waterfall", method: { kind: "level-up", level: 35 } },
    { moveId: "horn-drill", method: { kind: "level-up", level: 50 } },
  ],
};
