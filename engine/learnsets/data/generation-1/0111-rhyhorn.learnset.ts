import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Rhyhorn (#0111) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const RHYHORN_LEARNSET: PokemonLearnset = {
  pokemonId: "rhyhorn",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 5 } },
    { moveId: "horn-attack", method: { kind: "level-up", level: 15 } },
    { moveId: "stomp", method: { kind: "level-up", level: 25 } },
    { moveId: "take-down", method: { kind: "level-up", level: 40 } },
    { moveId: "earthquake", method: { kind: "level-up", level: 45 } },
    { moveId: "horn-drill", method: { kind: "level-up", level: 60 } },
  ],
};
