import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Weepinbell (#0070) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const WEEPINBELL_LEARNSET: PokemonLearnset = {
  pokemonId: "weepinbell",
  generation: 1,
  entries: [
    { moveId: "growth", method: { kind: "level-up", level: 1 } },
    { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "wrap", method: { kind: "level-up", level: 1 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 13 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 15 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 17 } },
    { moveId: "acid", method: { kind: "level-up", level: 24 } },
    { moveId: "razor-leaf", method: { kind: "level-up", level: 44 } },
    { moveId: "slam", method: { kind: "level-up", level: 54 } },
  ],
};
