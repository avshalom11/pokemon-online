import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Sandslash (#0028) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SANDSLASH_LEARNSET: PokemonLearnset = {
  pokemonId: "sandslash",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "swift", method: { kind: "level-up", level: 21 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 26 } },
    { moveId: "slash", method: { kind: "level-up", level: 36 } },
    { moveId: "dig", method: { kind: "level-up", level: 41 } },
    { moveId: "swords-dance", method: { kind: "level-up", level: 51 } },
    { moveId: "earthquake", method: { kind: "level-up", level: 61 } },
  ],
};
