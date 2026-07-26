import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Nidoran♂ (#0032) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const NIDORAN_M_LEARNSET: PokemonLearnset = {
  pokemonId: "nidoran-m",
  generation: 1,
  entries: [
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
    { moveId: "peck", method: { kind: "level-up", level: 5 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 10 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 15 } },
    { moveId: "double-kick", method: { kind: "level-up", level: 25 } },
    { moveId: "horn-attack", method: { kind: "level-up", level: 30 } },
    { moveId: "toxic", method: { kind: "level-up", level: 40 } },
    { moveId: "horn-drill", method: { kind: "level-up", level: 45 } },
  ],
};
