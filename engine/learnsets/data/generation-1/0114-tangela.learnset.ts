import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Tangela (#0114) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const TANGELA_LEARNSET: PokemonLearnset = {
  pokemonId: "tangela",
  generation: 1,
  entries: [
    { moveId: "absorb", method: { kind: "level-up", level: 1 } },
    { moveId: "bind", method: { kind: "level-up", level: 1 } },
    { moveId: "constrict", method: { kind: "level-up", level: 1 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 4 } },
    { moveId: "growth", method: { kind: "level-up", level: 8 } },
    { moveId: "mega-drain", method: { kind: "level-up", level: 12 } },
    { moveId: "vine-whip", method: { kind: "level-up", level: 16 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 20 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 36 } },
    { moveId: "slam", method: { kind: "level-up", level: 40 } },
  ],
};
