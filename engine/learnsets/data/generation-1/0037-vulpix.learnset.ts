import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Vulpix (#0037) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const VULPIX_LEARNSET: PokemonLearnset = {
  pokemonId: "vulpix",
  generation: 1,
  entries: [
    { moveId: "ember", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "disable", method: { kind: "level-up", level: 4 } },
    { moveId: "roar", method: { kind: "level-up", level: 7 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 8 } },
    { moveId: "confuse-ray", method: { kind: "level-up", level: 20 } },
    { moveId: "flamethrower", method: { kind: "level-up", level: 32 } },
    { moveId: "fire-spin", method: { kind: "level-up", level: 40 } },
    { moveId: "fire-blast", method: { kind: "level-up", level: 52 } },
  ],
};
