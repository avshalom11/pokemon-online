import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Exeggutor (#0103) — Generation 1 species.
//
// NOT the original 1996 Red/Blue/Yellow learnset. Levels and the move set
// itself reflect MODERN (current-generation) level-up data, filtered to
// moves that exist in this project's Generation 1 move database. See the
// "IMPORTANT" note atop ./index.ts for the full explanation of what that
// means and why.
export const EXEGGUTOR_LEARNSET: PokemonLearnset = {
  pokemonId: "exeggutor",
  generation: 1,
  entries: [
    { moveId: "absorb", method: { kind: "level-up", level: 1 } },
    { moveId: "barrage", method: { kind: "level-up", level: 1 } },
    { moveId: "confusion", method: { kind: "level-up", level: 1 } },
    { moveId: "growth", method: { kind: "level-up", level: 1 } },
    { moveId: "hypnosis", method: { kind: "level-up", level: 1 } },
    { moveId: "leech-seed", method: { kind: "level-up", level: 1 } },
    { moveId: "mega-drain", method: { kind: "level-up", level: 1 } },
    { moveId: "reflect", method: { kind: "level-up", level: 1 } },
    { moveId: "solar-beam", method: { kind: "level-up", level: 1 } },
    { moveId: "stomp", method: { kind: "level-up", level: 1 } },
    { moveId: "egg-bomb", method: { kind: "level-up", level: 27 } },
  ],
};
