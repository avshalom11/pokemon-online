import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Bulbasaur (#0001) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const BULBASAUR_LEARNSET: PokemonLearnset = {
  pokemonId: "bulbasaur",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "vine-whip", method: { kind: "level-up", level: 3 } },
    { moveId: "growth", method: { kind: "level-up", level: 6 } },
    { moveId: "leech-seed", method: { kind: "level-up", level: 9 } },
    { moveId: "razor-leaf", method: { kind: "level-up", level: 12 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 15 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 15 } },
    { moveId: "take-down", method: { kind: "level-up", level: 21 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 33 } },
    { moveId: "solar-beam", method: { kind: "level-up", level: 36 } },
  ],
};
