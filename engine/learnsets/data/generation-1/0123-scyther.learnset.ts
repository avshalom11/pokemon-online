import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Scyther (#0123) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SCYTHER_LEARNSET: PokemonLearnset = {
  pokemonId: "scyther",
  generation: 1,
  entries: [
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "wing-attack", method: { kind: "level-up", level: 12 } },
    { moveId: "double-team", method: { kind: "level-up", level: 16 } },
    { moveId: "slash", method: { kind: "level-up", level: 24 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 28 } },
    { moveId: "agility", method: { kind: "level-up", level: 32 } },
    { moveId: "razor-wind", method: { kind: "level-up", level: 33 } },
    { moveId: "swords-dance", method: { kind: "level-up", level: 44 } },
  ],
};
