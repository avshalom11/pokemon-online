import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Poliwhirl (#0061) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const POLIWHIRL_LEARNSET: PokemonLearnset = {
  pokemonId: "poliwhirl",
  generation: 1,
  entries: [
    { moveId: "hypnosis", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "bubble", method: { kind: "level-up", level: 11 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 15 } },
    { moveId: "bubble-beam", method: { kind: "level-up", level: 18 } },
    { moveId: "body-slam", method: { kind: "level-up", level: 32 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 48 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 66 } },
  ],
};
