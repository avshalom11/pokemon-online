import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Pidgey (#0016) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PIDGEY_LEARNSET: PokemonLearnset = {
  pokemonId: "pidgey",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 5 } },
    { moveId: "gust", method: { kind: "level-up", level: 9 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 13 } },
    { moveId: "whirlwind", method: { kind: "level-up", level: 17 } },
    { moveId: "agility", method: { kind: "level-up", level: 29 } },
    { moveId: "wing-attack", method: { kind: "level-up", level: 33 } },
    { moveId: "mirror-move", method: { kind: "level-up", level: 45 } },
  ],
};
