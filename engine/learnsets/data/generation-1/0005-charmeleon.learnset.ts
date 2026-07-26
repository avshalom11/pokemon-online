import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Charmeleon (#0005) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const CHARMELEON_LEARNSET: PokemonLearnset = {
  pokemonId: "charmeleon",
  generation: 1,
  entries: [
    { moveId: "ember", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "smokescreen", method: { kind: "level-up", level: 1 } },
    { moveId: "dragon-rage", method: { kind: "level-up", level: 17 } },
    { moveId: "rage", method: { kind: "level-up", level: 20 } },
    { moveId: "slash", method: { kind: "level-up", level: 24 } },
    { moveId: "flamethrower", method: { kind: "level-up", level: 30 } },
    { moveId: "fire-spin", method: { kind: "level-up", level: 42 } },
  ],
};
