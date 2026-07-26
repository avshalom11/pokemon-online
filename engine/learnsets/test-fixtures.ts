import type { PokemonLearnset } from "./types/learnset.types.ts";

// Shared sample data for the learnset engine's own tests. Small and
// hand-picked to exercise every learning method, multiple moves at the
// same level, level ordering, and distinct version-group records for the
// same move — not real Generation 1 learnset data (Phase 4A doesn't
// populate that; it's Phase 4B's job). Uses real move ids (from the
// Generation 1 move database) and real Pokémon species ids (from
// data/pokemon/pokemon-data.ts) so referential validation has something
// genuine to check against.

export const BULBASAUR_LEARNSET: PokemonLearnset = {
  pokemonId: "bulbasaur",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "leech-seed", method: { kind: "level-up", level: 7 } },
    { moveId: "vine-whip", method: { kind: "level-up", level: 13 } },
    { moveId: "razor-leaf", method: { kind: "machine", machineType: "tm", machineId: "tm22" } },
    { moveId: "swords-dance", method: { kind: "tutor" } },
    { moveId: "amnesia", method: { kind: "egg" } },
    { moveId: "transform", method: { kind: "special" } },
  ],
};

export const CHARMANDER_LEARNSET: PokemonLearnset = {
  pokemonId: "charmander",
  generation: 1,
  entries: [
    { moveId: "scratch", method: { kind: "level-up", level: 1 } },
    { moveId: "growl", method: { kind: "level-up", level: 1 } },
    { moveId: "ember", method: { kind: "level-up", level: 9 } },
    // A distinct version-group record for the same move at a different
    // level — legitimate, not a contradiction, because the version group
    // differs from the unscoped Ember entry above.
    { moveId: "ember", method: { kind: "level-up", level: 7 }, versionGroup: "yellow" },
    { moveId: "water-gun", method: { kind: "machine", machineType: "hm", machineId: "hm03" } },
  ],
};

export const SQUIRTLE_LEARNSET: PokemonLearnset = {
  pokemonId: "squirtle",
  generation: 1,
  entries: [
    { moveId: "tackle", method: { kind: "level-up", level: 1 } },
    { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    { moveId: "bubble", method: { kind: "level-up", level: 8 } },
    { moveId: "withdraw", method: { kind: "level-up", level: 10 } },
  ],
};

export const PIKACHU_LEARNSET: PokemonLearnset = {
  pokemonId: "pikachu",
  generation: 1,
  entries: [
    { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
    { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
    { moveId: "thunderbolt", method: { kind: "machine", machineType: "tm", machineId: "tm24" } },
  ],
};

export const SAMPLE_LEARNSETS: PokemonLearnset[] = [
  BULBASAUR_LEARNSET,
  CHARMANDER_LEARNSET,
  SQUIRTLE_LEARNSET,
  PIKACHU_LEARNSET,
];
