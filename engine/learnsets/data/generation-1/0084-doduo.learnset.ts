import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Doduo (#0084) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const DODUO_LEARNSET: PokemonLearnset = {
  pokemonId: "doduo",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "peck", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 5 } },
    { moveId: "rage", method: { kind: "level-up", level: 8 } },
    { moveId: "fury-attack", method: { kind: "level-up", level: 9 } },
    { moveId: "tri-attack", method: { kind: "level-up", level: 21 } },
    { moveId: "agility", method: { kind: "level-up", level: 23 } },
    { moveId: "swords-dance", method: { kind: "level-up", level: 33 } },
    { moveId: "drill-peck", method: { kind: "level-up", level: 36 } },
    { moveId: "jump-kick", method: { kind: "level-up", level: 40 } },
    { moveId: "thrash", method: { kind: "level-up", level: 43 } },
  ],
};
