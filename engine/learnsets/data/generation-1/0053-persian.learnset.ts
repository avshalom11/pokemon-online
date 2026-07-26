import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Persian (#0053) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const PERSIAN_LEARNSET: PokemonLearnset = {
  pokemonId: "persian",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "swift", method: { kind: "level-up", level: 1 } },
    { moveId: "pay-day", method: { kind: "level-up", level: 12 } },
    { moveId: "bite", method: { kind: "level-up", level: 16 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 31 } },
    { moveId: "screech", method: { kind: "level-up", level: 36 } },
    { moveId: "slash", method: { kind: "level-up", level: 42 } },
  ],
};
