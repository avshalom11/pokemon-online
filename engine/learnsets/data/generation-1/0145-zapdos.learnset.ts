import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Zapdos (#0145) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const ZAPDOS_LEARNSET: PokemonLearnset = {
  pokemonId: "zapdos",
  generation: 1,
  entries: [
    { moveId: "peck", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-wave", method: { kind: "level-up", level: 1 } },
    { moveId: "thunder-shock", method: { kind: "level-up", level: 5 } },
    { moveId: "light-screen", method: { kind: "level-up", level: 10 } },
    { moveId: "agility", method: { kind: "level-up", level: 20 } },
    { moveId: "drill-peck", method: { kind: "level-up", level: 35 } },
    { moveId: "thunder", method: { kind: "level-up", level: 55 } },
  ],
};
