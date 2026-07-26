import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Poliwrath (#0062) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const POLIWRATH_LEARNSET: PokemonLearnset = {
  pokemonId: "poliwrath",
  generation: 1,
  entries: [
    { moveId: "body-slam", method: { kind: "level-up", level: 1 } },
    { moveId: "bubble-beam", method: { kind: "level-up", level: 1 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 1 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 1 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 1 } },
    { moveId: "hypnosis", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "submission", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
  ],
};
