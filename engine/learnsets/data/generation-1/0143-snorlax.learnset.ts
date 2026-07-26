import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Snorlax (#0143) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SNORLAX_LEARNSET: PokemonLearnset = {
  pokemonId: "snorlax",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "lick", method: { kind: "level-up", level: 1 } },
    { moveId: "metronome", method: { kind: "level-up", level: 1 } },
    { moveId: "screech", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "bite", method: { kind: "level-up", level: 16 } },
    { moveId: "headbutt", method: { kind: "level-up", level: 17 } },
    { moveId: "rest", method: { kind: "level-up", level: 20 } },
    { moveId: "body-slam", method: { kind: "level-up", level: 28 } },
    { moveId: "amnesia", method: { kind: "level-up", level: 36 } },
    { moveId: "hyper-beam", method: { kind: "level-up", level: 51 } },
  ],
};
