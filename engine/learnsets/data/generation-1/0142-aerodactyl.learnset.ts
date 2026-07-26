import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Aerodactyl (#0142) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const AERODACTYL_LEARNSET: PokemonLearnset = {
  pokemonId: "aerodactyl",
  generation: 1,
  entries: [
    { moveId: "bite", method: { kind: "level-up", level: 1 } },
    { moveId: "supersonic", method: { kind: "level-up", level: 5 } },
    { moveId: "wing-attack", method: { kind: "level-up", level: 10 } },
    { moveId: "rock-slide", method: { kind: "level-up", level: 20 } },
    { moveId: "roar", method: { kind: "level-up", level: 25 } },
    { moveId: "take-down", method: { kind: "level-up", level: 40 } },
    { moveId: "agility", method: { kind: "level-up", level: 50 } },
    { moveId: "hyper-beam", method: { kind: "level-up", level: 55 } },
  ],
};
