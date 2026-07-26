import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Meowth (#0052) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const MEOWTH_LEARNSET: PokemonLearnset = {
  pokemonId: "meowth",
  generation: 1,
  entries: [
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 8 } },
    { moveId: "pay-day", method: { kind: "level-up", level: 12 } },
    { moveId: "bite", method: { kind: "level-up", level: 16 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 29 } },
    { moveId: "screech", method: { kind: "level-up", level: 32 } },
    { moveId: "slash", method: { kind: "level-up", level: 36 } },
  ],
};
