import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Psyduck (#0054) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PSYDUCK_LEARNSET: PokemonLearnset = {
  pokemonId: "psyduck",
  generation: 1,
  entries: [
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 3 } },
    { moveId: "confusion", method: { kind: "level-up", level: 6 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 9 } },
    { moveId: "disable", method: { kind: "level-up", level: 15 } },
    { moveId: "screech", method: { kind: "level-up", level: 21 } },
    { moveId: "amnesia", method: { kind: "level-up", level: 34 } },
    { moveId: "hydro-pump", method: { kind: "level-up", level: 36 } },
  ],
};
