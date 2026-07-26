import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Paras (#0046) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PARAS_LEARNSET: PokemonLearnset = {
  pokemonId: "paras",
  generation: 1,
  entries: [
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 6 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 6 } },
    { moveId: "absorb", method: { kind: "level-up", level: 11 } },
    { moveId: "leech-life", method: { kind: "level-up", level: 11 } },
    { moveId: "spore", method: { kind: "level-up", level: 22 } },
    { moveId: "slash", method: { kind: "level-up", level: 27 } },
    { moveId: "growth", method: { kind: "level-up", level: 33 } },
  ],
};
