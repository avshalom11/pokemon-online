import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Venonat (#0048) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const VENONAT_LEARNSET: PokemonLearnset = {
  pokemonId: "venonat",
  generation: 1,
  entries: [
    { moveId: "disable", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 5 } },
    { moveId: "confusion", method: { kind: "level-up", level: 11 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 13 } },
    { moveId: "psybeam", method: { kind: "level-up", level: 17 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 23 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 29 } },
    { moveId: "leech-life", method: { kind: "level-up", level: 35 } },
    { moveId: "psychic", method: { kind: "level-up", level: 47 } },
  ],
};
