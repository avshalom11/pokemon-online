import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Poliwag (#0060) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const POLIWAG_LEARNSET: PokemonLearnset = {
  pokemonId: "poliwag",
  generation: 1,
  entries: [
    { moveId: "hypnosis", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 6 } },
    { moveId: "bubble", method: { kind: "level-up", level: 11 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 15 } },
    { moveId: "bubble-beam", method: { kind: "level-up", level: 18 } },
    { moveId: "body-slam", method: { kind: "level-up", level: 30 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 42 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 54 } },
  ],
};
