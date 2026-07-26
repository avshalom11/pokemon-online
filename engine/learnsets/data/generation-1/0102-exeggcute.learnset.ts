import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Exeggcute (#0102) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const EXEGGCUTE_LEARNSET: PokemonLearnset = {
  pokemonId: "exeggcute",
  generation: 1,
  entries: [
    { moveId: "absorb", method: { kind: "level-up", level: 1 } },
    { moveId: "barrage", method: { kind: "level-up", level: 1 } },
    { moveId: "hypnosis", method: { kind: "level-up", level: 1 } },
    { moveId: "reflect", method: { kind: "level-up", level: 5 } },
    { moveId: "leech-seed", method: { kind: "level-up", level: 10 } },
    { moveId: "mega-drain", method: { kind: "level-up", level: 15 } },
    { moveId: "stun-spore", method: { kind: "level-up", level: 19 } },
    { moveId: "confusion", method: { kind: "level-up", level: 20 } },
    { moveId: "poison-powder", method: { kind: "level-up", level: 21 } },
    { moveId: "sleep-powder", method: { kind: "level-up", level: 23 } },
    { moveId: "psychic", method: { kind: "level-up", level: 47 } },
    { moveId: "solar-beam", method: { kind: "level-up", level: 55 } },
  ],
};
