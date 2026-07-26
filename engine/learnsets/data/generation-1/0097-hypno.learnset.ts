import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Hypno (#0097) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const HYPNO_LEARNSET: PokemonLearnset = {
  pokemonId: "hypno",
  generation: 1,
  entries: [
    { moveId: "confusion", method: { kind: "level-up", level: 1 } },
    { moveId: "disable", method: { kind: "level-up", level: 1 } },
    { moveId: "hypnosis", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "headbutt", method: { kind: "level-up", level: 13 } },
    { moveId: "poison-gas", method: { kind: "level-up", level: 17 } },
    { moveId: "meditate", method: { kind: "level-up", level: 21 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 21 } },
    { moveId: "psychic", method: { kind: "level-up", level: 42 } },
  ],
};
