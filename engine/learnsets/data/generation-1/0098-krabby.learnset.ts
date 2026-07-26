import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Krabby (#0098) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const KRABBY_LEARNSET: PokemonLearnset = {
  pokemonId: "krabby",
  generation: 1,
  entries: [
    { moveId: "bubble", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    { moveId: "harden", method: { kind: "level-up", level: 4 } },
    { moveId: "vise-grip", method: { kind: "level-up", level: 5 } },
    { moveId: "bubble-beam", method: { kind: "level-up", level: 20 } },
    { moveId: "stomp", method: { kind: "level-up", level: 24 } },
    { moveId: "slam", method: { kind: "level-up", level: 36 } },
    { moveId: "swords-dance", method: { kind: "level-up", level: 40 } },
    { moveId: "crabhammer", method: { kind: "level-up", level: 44 } },
    { moveId: "guillotine", method: { kind: "level-up", level: 48 } },
  ],
};
