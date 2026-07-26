import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Venusaur (#0003) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const VENUSAUR_LEARNSET: PokemonLearnset = {
  pokemonId: "venusaur",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "growth", method: { kind: "level-up", level: 1 } },
    { moveId: "petal-dance", method: { kind: "level-up", level: 1 } },
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "leech-seed", method: { kind: "level-up", level: 9 } },
    { moveId: "razor-leaf", method: { kind: "level-up", level: 12 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 15 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 15 } },
    { moveId: "take-down", method: { kind: "level-up", level: 25 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 51 } },
    { moveId: "solar-beam", method: { kind: "level-up", level: 58 } },
  ],
};
