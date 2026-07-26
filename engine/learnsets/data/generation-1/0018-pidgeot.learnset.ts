import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Pidgeot (#0018) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PIDGEOT_LEARNSET: PokemonLearnset = {
  pokemonId: "pidgeot",
  generation: 1,
  entries: [
    { moveId: "gust", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "whirlwind", method: { kind: "level-up", level: 17 } },
    { moveId: "agility", method: { kind: "level-up", level: 32 } },
    { moveId: "wing-attack", method: { kind: "level-up", level: 38 } },
    { moveId: "mirror-move", method: { kind: "level-up", level: 56 } },
  ],
};
