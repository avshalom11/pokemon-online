import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Chansey (#0113) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const CHANSEY_LEARNSET: PokemonLearnset = {
  pokemonId: "chansey",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "minimize", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 4 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 12 } },
    { moveId: "sing", method: { kind: "level-up", level: 16 } },
    { moveId: "take-down", method: { kind: "level-up", level: 24 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 36 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 40 } },
    { moveId: "egg-bomb", method: { kind: "level-up", level: 42 } },
    { moveId: "soft-boiled", method: { kind: "level-up", level: 44 } },
  ],
};
