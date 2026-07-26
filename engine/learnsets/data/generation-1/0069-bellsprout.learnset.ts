import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Bellsprout (#0069) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const BELLSPROUT_LEARNSET: PokemonLearnset = {
  pokemonId: "bellsprout",
  generation: 1,
  entries: [
    { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "growth", method: { kind: "level-up", level: 7 } },
    { moveId: "wrap", method: { kind: "level-up", level: 11 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 13 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 15 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 17 } },
    { moveId: "acid", method: { kind: "level-up", level: 23 } },
    { moveId: "razor-leaf", method: { kind: "level-up", level: 39 } },
    { moveId: "slam", method: { kind: "level-up", level: 47 } },
  ],
};
