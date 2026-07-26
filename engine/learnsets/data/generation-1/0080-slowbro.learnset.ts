import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Slowbro (#0080) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SLOWBRO_LEARNSET: PokemonLearnset = {
  pokemonId: "slowbro",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
    { moveId: "confusion", method: { kind: "level-up", level: 12 } },
    { moveId: "disable", method: { kind: "level-up", level: 15 } },
    { moveId: "headbutt", method: { kind: "level-up", level: 21 } },
    { moveId: "amnesia", method: { kind: "level-up", level: 27 } },
    { moveId: "surf", method: { kind: "level-up", level: 30 } },
    { moveId: "psychic", method: { kind: "level-up", level: 36 } },
  ],
};
