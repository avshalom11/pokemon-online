import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Zubat (#0041) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ZUBAT_LEARNSET: PokemonLearnset = {
  pokemonId: "zubat",
  generation: 1,
  entries: [
    { moveId: "absorb", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 1 } },
    { moveId: "wing-attack", method: { kind: "level-up", level: 13 } },
    { moveId: "swift", method: { kind: "level-up", level: 23 } },
    { moveId: "bite", method: { kind: "level-up", level: 30 } },
    { moveId: "haze", method: { kind: "level-up", level: 35 } },
    { moveId: "confuse-ray", method: { kind: "level-up", level: 45 } },
    { moveId: "leech-life", method: { kind: "level-up", level: 55 } },
  ],
};
