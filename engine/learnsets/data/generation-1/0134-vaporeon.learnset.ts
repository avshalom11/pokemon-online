import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Vaporeon (#0134) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const VAPOREON_LEARNSET: PokemonLearnset = {
  pokemonId: "vaporeon",
  generation: 1,
  entries: [
    { moveId: "bite", method: { kind: "level-up", level: 1 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "swift", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "take-down", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 5 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 10 } },
    { moveId: "haze", method: { kind: "level-up", level: 20 } },
    { moveId: "aurora-beam", method: { kind: "level-up", level: 30 } },
    { moveId: "acid-armor", method: { kind: "level-up", level: 45 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 50 } },
  ],
};
