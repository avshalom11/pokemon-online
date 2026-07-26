import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Butterfree (#0012) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const BUTTERFREE_LEARNSET: PokemonLearnset = {
  pokemonId: "butterfree",
  generation: 1,
  entries: [
    { moveId: "gust", method: { kind: "level-up", level: 1 } },
    { moveId: "harden", method: { kind: "level-up", level: 1 } },
    { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 4 } },
    { moveId: "confusion", method: { kind: "level-up", level: 8 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 12 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 12 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 12 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 16 } },
    { moveId: "whirlwind", method: { kind: "level-up", level: 20 } },
  ],
};
