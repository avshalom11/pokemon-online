import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Sandshrew (#0027) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const SANDSHREW_LEARNSET: PokemonLearnset = {
  pokemonId: "sandshrew",
  generation: 1,
  entries: [
    { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-sting", method: { kind: "level-up", level: 3 } },
    { moveId: "sand-attack", method: { kind: "level-up", level: 6 } },
    { moveId: "swift", method: { kind: "level-up", level: 21 } },
    { moveId: "fury-swipes", method: { kind: "level-up", level: 24 } },
    { moveId: "agility", method: { kind: "level-up", level: 27 } },
    { moveId: "slash", method: { kind: "level-up", level: 30 } },
    { moveId: "dig", method: { kind: "level-up", level: 33 } },
    { moveId: "swords-dance", method: { kind: "level-up", level: 39 } },
    { moveId: "earthquake", method: { kind: "level-up", level: 45 } },
  ],
};
