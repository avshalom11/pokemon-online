import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Hitmonlee (#0106) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const HITMONLEE_LEARNSET: PokemonLearnset = {
  pokemonId: "hitmonlee",
  generation: 1,
  entries: [
    { moveId: "focus-energy", method: { kind: "level-up", level: 1 } },
    { moveId: "jump-kick", method: { kind: "level-up", level: 1 } },
    { moveId: "meditate", method: { kind: "level-up", level: 1 } },
    { moveId: "rolling-kick", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "double-kick", method: { kind: "level-up", level: 4 } },
    { moveId: "low-kick", method: { kind: "level-up", level: 8 } },
    { moveId: "mega-kick", method: { kind: "level-up", level: 32 } },
    { moveId: "high-jump-kick", method: { kind: "level-up", level: 44 } },
  ],
};
