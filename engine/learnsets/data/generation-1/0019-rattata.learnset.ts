import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Rattata (#0019) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const RATTATA_LEARNSET: PokemonLearnset = {
  pokemonId: "rattata",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 4 } },
    { moveId: "focus-energy", method: { kind: "level-up", level: 7 } },
    { moveId: "bite", method: { kind: "level-up", level: 10 } },
    { moveId: "hyper-fang", method: { kind: "level-up", level: 16 } },
    { moveId: "super-fang", method: { kind: "level-up", level: 28 } },
    { moveId: "double-edge", method: { kind: "level-up", level: 31 } },
  ],
};
