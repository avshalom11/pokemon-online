import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Vileplume (#0045) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const VILEPLUME_LEARNSET: PokemonLearnset = {
  pokemonId: "vileplume",
  generation: 1,
  entries: [
    { moveId: "absorb", method: { kind: "level-up", level: 1 } },
    { moveId: "acid", method: { kind: "level-up", level: 1 } },
    { moveId: "growth", method: { kind: "level-up", level: 1 } },
    { moveId: "mega-drain", method: { kind: "level-up", level: 1 } },
    { moveId: "petal-dance", method: { kind: "level-up", level: 1 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 1 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 1 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 1 } },
    { moveId: "toxic", method: { kind: "level-up", level: 1 } },
    { moveId: "solar-beam", method: { kind: "level-up", level: 69 } },
  ],
};
