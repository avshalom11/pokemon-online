import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Eevee (#0133) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const EEVEE_LEARNSET: PokemonLearnset = {
  pokemonId: "eevee",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 5 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 10 } },
    { moveId: "swift", method: { kind: "level-up", level: 20 } },
    { moveId: "bite", method: { kind: "level-up", level: 25 } },
    { moveId: "take-down", method: { kind: "level-up", level: 40 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 50 } },
  ],
};
