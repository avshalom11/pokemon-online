import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Nidorina (#0030) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const NIDORINA_LEARNSET: PokemonLearnset = {
  pokemonId: "nidorina",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 15 } },
    { moveId: "double-kick", method: { kind: "level-up", level: 29 } },
    { moveId: "bite", method: { kind: "level-up", level: 36 } },
    { moveId: "toxic", method: { kind: "level-up", level: 50 } },
  ],
};
