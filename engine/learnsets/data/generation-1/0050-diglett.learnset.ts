import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Diglett (#0050) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const DIGLETT_LEARNSET: PokemonLearnset = {
  pokemonId: "diglett",
  generation: 1,
  entries: [
    { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 4 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 21 } },
    { moveId: "slash", method: { kind: "level-up", level: 24 } },
    { moveId: "dig", method: { kind: "level-up", level: 32 } },
    { moveId: "earthquake", method: { kind: "level-up", level: 40 } },
    { moveId: "fissure", method: { kind: "level-up", level: 44 } },
  ],
};
