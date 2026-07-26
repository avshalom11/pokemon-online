import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Nidoking (#0034) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const NIDOKING_LEARNSET: PokemonLearnset = {
  pokemonId: "nidoking",
  generation: 1,
  entries: [
    { moveId: "double-kick", method: { kind: "level-up", level: 1 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 1 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "horn-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "leer", method: { kind: "level-up", level: 1 } },
    { moveId: "peck", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
    { moveId: "toxic", method: { kind: "level-up", level: 1 } },
    { moveId: "thrash", method: { kind: "level-up", level: 35 } },
  ],
};
