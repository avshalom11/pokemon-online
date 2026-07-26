import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Kabuto (#0140) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const KABUTO_LEARNSET: PokemonLearnset = {
  pokemonId: "kabuto",
  generation: 1,
  entries: [
    { moveId: "absorb", method: { kind: "level-up", level: 1 } },
    { moveId: "harden", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 5 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 10 } },
    { moveId: "leer", method: { kind: "level-up", level: 20 } },
    { moveId: "mega-drain", method: { kind: "level-up", level: 36 } },
    { moveId: "leech-life", method: { kind: "level-up", level: 45 } },
  ],
};
