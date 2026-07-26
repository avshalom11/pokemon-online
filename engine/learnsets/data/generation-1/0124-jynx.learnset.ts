import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Jynx (#0124) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const JYNX_LEARNSET: PokemonLearnset = {
  pokemonId: "jynx",
  generation: 1,
  entries: [
    { moveId: "lick", method: { kind: "level-up", level: 1 } },
    { moveId: "pound", method: { kind: "level-up", level: 1 } },
    { moveId: "confusion", method: { kind: "level-up", level: 12 } },
    { moveId: "double-slap", method: { kind: "level-up", level: 15 } },
    { moveId: "sing", method: { kind: "level-up", level: 20 } },
    { moveId: "ice-punch", method: { kind: "level-up", level: 28 } },
    { moveId: "psychic", method: { kind: "level-up", level: 34 } },
    { moveId: "lovely-kiss", method: { kind: "level-up", level: 40 } },
    { moveId: "body-slam", method: { kind: "level-up", level: 44 } },
    { moveId: "blizzard", method: { kind: "level-up", level: 58 } },
  ],
};
