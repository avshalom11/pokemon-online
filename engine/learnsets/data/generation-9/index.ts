import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Generation 9 (Paldea Moves & Learnsets Phase 3) — one single file in
// National Dex order, the same shape Generation 2-8's own index.ts files
// already established (never split per-species like Generation 1).
//
// Level-up-only entries, no TM/tutor/egg/event data — out of scope for this
// phase, same as every existing generation. Levels are approximate, chosen
// to read as a sensible progression (2-8 entries per species), matching the
// density Generation 2-8 already use. Entries are drawn from the FULL move
// database (every generation 1-9 move), not restricted to Generation 9's own
// 33 new moves — a Paldea species can legitimately know an older move when
// thematically appropriate, same as every prior generation.
//
// Every evolved stage repeats its own pre-evolution's moves at level 1 (the
// same "Torterra already knows everything Turtwig had" precedent every
// prior generation's file already established), then adds new moves at
// levels above THAT SPECIES' OWN incoming-evolution threshold from
// data/pokemon/pokemon-evolutions.ts (Paldea Phase 2) — never colliding
// with it. Species reached only via an evolution-item (Bellibolt/
// Scovillain/Cetitan) or a Branch target (Armarouge/Ceruledge/Dipplin) have
// no real level floor of their own (see engine/evolution-stage-scaling's own
// "evolution-item/Branch targets are fully unrestricted" rule) — their own
// entries are still leveled for flavor, exactly like Roserade/Weavile/
// Togekiss/Flapple/Appletun already are in earlier generations.
//
// Four species evolve from an OLDER-generation species that this file does
// NOT own (Primeape #57 Gen1, Girafarig #203 Gen2, Dunsparce #206 Gen2,
// Bisharp #625 Gen5): Annihilape, Farigiraf, Dudunsparce, and Kingambit each
// get their own fresh, self-contained level 1..40/55 progression instead of
// repeating their pre-evolution's moves — the same precedent the Pre-Paldea
// step's Wyrdeer/Kleavor/Ursaluna/Basculegion/Sneasler/Overqwil already
// established for this exact "new species, older-generation pre-evolution"
// shape (see generation-4/index.ts). Their own pre-evolution's learnset
// (living in that other generation's file) is completely untouched.
//
// ==========================================================================
// The 4 Paldean Forms
// ==========================================================================
// wooper-paldea (base lives in generation-2-pokemon-data.ts, dex #194) and
// the three Tauros breeds (base lives in generation-1-pokemon-data.ts, dex
// #128) are each their own independent, explicit static learnset — never
// runtime inheritance from their ordinary counterpart, the same
// architectural decision Alolan/Galarian/Hisuian Forms already established.
// Clodsire repeats Paldean Wooper's own moves at level 1 (never ordinary
// Wooper's — ordinary Wooper evolves into Quagsire, a completely separate,
// untouched line). The three Tauros breeds are standalone (Paldea Phase 2's
// own explicit scope: no evolution of any kind), each with its own
// self-contained progression built around Raging Bull, whose real type
// depends on the user's own breed — this project's move schema has no
// per-user dynamic typing (same simplification precedent as Tera Blast), so
// Raging Bull is one fixed Normal-type move shared by all three breeds; see
// engine/moves/data/generation-9/normal.moves.ts's own note.
export const GENERATION_9_LEARNSETS: PokemonLearnset[] = [
  {
    pokemonId: "sprigatito",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "leafage", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "floragato",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "leafage", method: { kind: "level-up", level: 1 } },
      { moveId: "trailblaze", method: { kind: "level-up", level: 20 } },
      { moveId: "slash", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "meowscarada",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "leafage", method: { kind: "level-up", level: 1 } },
      { moveId: "trailblaze", method: { kind: "level-up", level: 1 } },
      { moveId: "slash", method: { kind: "level-up", level: 1 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 40 } },
      { moveId: "leaf-blade", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "fuecoco",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "crocalor",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 20 } },
      { moveId: "fire-fang", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "skeledirge",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "fire-fang", method: { kind: "level-up", level: 1 } },
      { moveId: "torch-song", method: { kind: "level-up", level: 40 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "quaxly",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "quaxwell",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "double-kick", method: { kind: "level-up", level: 20 } },
      { moveId: "aqua-jet", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "quaquaval",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "double-kick", method: { kind: "level-up", level: 1 } },
      { moveId: "aqua-jet", method: { kind: "level-up", level: 1 } },
      { moveId: "axe-kick", method: { kind: "level-up", level: 40 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "lechonk",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "headbutt", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "oinkologne",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "headbutt", method: { kind: "level-up", level: 1 } },
      { moveId: "take-down", method: { kind: "level-up", level: 24 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 32 } },
    ],
  },
  {
    pokemonId: "tarountula",
    generation: 9,
    entries: [
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "bug-bite", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "spidops",
    generation: 9,
    entries: [
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "bug-bite", method: { kind: "level-up", level: 1 } },
      { moveId: "silk-trap", method: { kind: "level-up", level: 22 } },
      { moveId: "fury-swipes", method: { kind: "level-up", level: 26 } },
      { moveId: "x-scissor", method: { kind: "level-up", level: 32 } },
    ],
  },
  {
    pokemonId: "nymble",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "lokix",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "double-kick", method: { kind: "level-up", level: 30 } },
      { moveId: "leech-life", method: { kind: "level-up", level: 38 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "pawmi",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "nuzzle", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "pawmo",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "nuzzle", method: { kind: "level-up", level: 1 } },
      { moveId: "double-kick", method: { kind: "level-up", level: 22 } },
      { moveId: "spark", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "pawmot",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "nuzzle", method: { kind: "level-up", level: 1 } },
      { moveId: "double-kick", method: { kind: "level-up", level: 1 } },
      { moveId: "spark", method: { kind: "level-up", level: 1 } },
      { moveId: "double-shock", method: { kind: "level-up", level: 44 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "tandemaus",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "maushold",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "double-hit", method: { kind: "level-up", level: 30 } },
      { moveId: "population-bomb", method: { kind: "level-up", level: 38 } },
      { moveId: "tidy-up", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "fidough",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "charm", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "dachsbun",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "charm", method: { kind: "level-up", level: 1 } },
      { moveId: "play-rough", method: { kind: "level-up", level: 30 } },
      { moveId: "crunch", method: { kind: "level-up", level: 38 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "smoliv",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "magical-leaf", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "dolliv",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "magical-leaf", method: { kind: "level-up", level: 1 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "arboliva",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "magical-leaf", method: { kind: "level-up", level: 1 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 1 } },
      { moveId: "energy-ball", method: { kind: "level-up", level: 40 } },
      { moveId: "seed-bomb", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "squawkabilly",
    generation: 9,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 15 } },
      { moveId: "fury-attack", method: { kind: "level-up", level: 25 } },
      { moveId: "aerial-ace", method: { kind: "level-up", level: 35 } },
    ],
  },
  {
    pokemonId: "nacli",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "naclstack",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "garganacl",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 1 } },
      { moveId: "salt-cure", method: { kind: "level-up", level: 42 } },
      { moveId: "stone-edge", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "charcadet",
    generation: 9,
    entries: [
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "smog", method: { kind: "level-up", level: 1 } },
      { moveId: "fire-spin", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "armarouge",
    generation: 9,
    entries: [
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "smog", method: { kind: "level-up", level: 1 } },
      { moveId: "fire-spin", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 44 } },
      { moveId: "bitter-blade", method: { kind: "level-up", level: 48 } },
      { moveId: "psychic", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "ceruledge",
    generation: 9,
    entries: [
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "smog", method: { kind: "level-up", level: 1 } },
      { moveId: "fire-spin", method: { kind: "level-up", level: 1 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 44 } },
      { moveId: "bitter-blade", method: { kind: "level-up", level: 48 } },
      { moveId: "shadow-claw", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "tadbulb",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "charge", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "bellibolt",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "charge", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "discharge", method: { kind: "level-up", level: 30 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "wattrel",
    generation: 9,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "kilowattrel",
    generation: 9,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "spark", method: { kind: "level-up", level: 30 } },
      { moveId: "wildbolt-storm", method: { kind: "level-up", level: 38 } },
      { moveId: "hurricane", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "maschiff",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "mabosstiff",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "crunch", method: { kind: "level-up", level: 34 } },
      { moveId: "take-down", method: { kind: "level-up", level: 40 } },
      { moveId: "foul-play", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "shroodle",
    generation: 9,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "grafaiai",
    generation: 9,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "acrobatics", method: { kind: "level-up", level: 32 } },
      { moveId: "gunk-shot", method: { kind: "level-up", level: 38 } },
      { moveId: "taunt", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "bramblin",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "brambleghast",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "leafage", method: { kind: "level-up", level: 44 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 48 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "toedscool",
    generation: 9,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "toedscruel",
    generation: 9,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 34 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 40 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "klawf",
    generation: 9,
    entries: [
      { moveId: "rock-throw", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "crabhammer", method: { kind: "level-up", level: 20 } },
      { moveId: "guillotine", method: { kind: "level-up", level: 30 } },
      { moveId: "stone-edge", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "capsakid",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "scovillain",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "flame-burst", method: { kind: "level-up", level: 30 } },
      { moveId: "solar-beam", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "rellor",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "rabsca",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 44 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 48 } },
      { moveId: "bug-buzz", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "flittle",
    generation: 9,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "espathra",
    generation: 9,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 38 } },
      { moveId: "psychic-noise", method: { kind: "level-up", level: 42 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "tinkatink",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "tinkatuff",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "tinkaton",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 1 } },
      { moveId: "gigaton-hammer", method: { kind: "level-up", level: 42 } },
      { moveId: "play-rough", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "wiglett",
    generation: 9,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "wugtrio",
    generation: 9,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "dig", method: { kind: "level-up", level: 30 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 38 } },
      { moveId: "muddy-water", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "bombirdier",
    generation: 9,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "pluck", method: { kind: "level-up", level: 1 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 15 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 30 } },
      { moveId: "brave-bird", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "finizen",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "palafin",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "aqua-jet", method: { kind: "level-up", level: 40 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 45 } },
      { moveId: "brine", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "varoom",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "smog", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "revavroom",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "smog", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-gas", method: { kind: "level-up", level: 44 } },
      { moveId: "spin-out", method: { kind: "level-up", level: 48 } },
      { moveId: "gunk-shot", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "cyclizar",
    generation: 9,
    entries: [
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 20 } },
      { moveId: "u-turn", method: { kind: "level-up", level: 30 } },
      { moveId: "dragon-dance", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "orthworm",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-tail", method: { kind: "level-up", level: 15 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 25 } },
      { moveId: "gyro-ball", method: { kind: "level-up", level: 35 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "glimmet",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "glimmora",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 38 } },
      { moveId: "mortal-spin", method: { kind: "level-up", level: 42 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "greavard",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "houndstone",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 34 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 40 } },
      { moveId: "crunch", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "flamigo",
    generation: 9,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 15 } },
      { moveId: "low-kick", method: { kind: "level-up", level: 25 } },
      { moveId: "brave-bird", method: { kind: "level-up", level: 35 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "cetoddle",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 1 } },
      { moveId: "headbutt", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "cetitan",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 1 } },
      { moveId: "headbutt", method: { kind: "level-up", level: 1 } },
      { moveId: "ice-fang", method: { kind: "level-up", level: 30 } },
      { moveId: "avalanche", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "veluza",
    generation: 9,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 1 } },
      { moveId: "aqua-jet", method: { kind: "level-up", level: 15 } },
      { moveId: "psychic", method: { kind: "level-up", level: 30 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "dondozo",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 25 } },
      { moveId: "waterfall", method: { kind: "level-up", level: 35 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "tatsugiri",
    generation: 9,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "muddy-water", method: { kind: "level-up", level: 25 } },
      { moveId: "draco-meteor", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "annihilape",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "karate-chop", method: { kind: "level-up", level: 8 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 16 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 24 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 32 } },
      { moveId: "shadow-punch", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "clodsire",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-bomb", method: { kind: "level-up", level: 30 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 40 } },
      { moveId: "recover", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "farigiraf",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 8 } },
      { moveId: "twin-beam", method: { kind: "level-up", level: 16 } },
      { moveId: "stomp", method: { kind: "level-up", level: 24 } },
      { moveId: "zen-headbutt", method: { kind: "level-up", level: 32 } },
      { moveId: "psychic", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "dudunsparce",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
      { moveId: "headbutt", method: { kind: "level-up", level: 8 } },
      { moveId: "glare", method: { kind: "level-up", level: 16 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 24 } },
      { moveId: "screech", method: { kind: "level-up", level: 32 } },
      { moveId: "hyper-drill", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "kingambit",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 8 } },
      { moveId: "faint-attack", method: { kind: "level-up", level: 16 } },
      { moveId: "slash", method: { kind: "level-up", level: 24 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 32 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 45 } },
      { moveId: "sucker-punch", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "great-tusk",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "stomping-tantrum", method: { kind: "level-up", level: 20 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 35 } },
      { moveId: "sandsear-storm", method: { kind: "level-up", level: 45 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 50 } },
      { moveId: "high-horsepower", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "scream-tail",
    generation: 9,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "disarming-voice", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 20 } },
      { moveId: "play-rough", method: { kind: "level-up", level: 35 } },
      { moveId: "psychic", method: { kind: "level-up", level: 45 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "brute-bonnet",
    generation: 9,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "seed-bomb", method: { kind: "level-up", level: 20 } },
      { moveId: "crunch", method: { kind: "level-up", level: 35 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 45 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "flutter-mane",
    generation: 9,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 20 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 35 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 45 } },
      { moveId: "hex", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "slither-wing",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "bug-bite", method: { kind: "level-up", level: 1 } },
      { moveId: "karate-chop", method: { kind: "level-up", level: 20 } },
      { moveId: "x-scissor", method: { kind: "level-up", level: 35 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 45 } },
      { moveId: "first-impression", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "sandy-shocks",
    generation: 9,
    entries: [
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "spark", method: { kind: "level-up", level: 20 } },
      { moveId: "supercell-slam", method: { kind: "level-up", level: 35 } },
      { moveId: "discharge", method: { kind: "level-up", level: 45 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-treads",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 20 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 35 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 45 } },
      { moveId: "high-horsepower", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-bundle",
    generation: 9,
    entries: [
      { moveId: "powder-snow", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "chilling-water", method: { kind: "level-up", level: 20 } },
      { moveId: "ice-beam", method: { kind: "level-up", level: 35 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 45 } },
      { moveId: "freeze-dry", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-hands",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "upper-hand", method: { kind: "level-up", level: 20 } },
      { moveId: "thunder-punch", method: { kind: "level-up", level: 35 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 45 } },
      { moveId: "drain-punch", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-jugulis",
    generation: 9,
    entries: [
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "gust", method: { kind: "level-up", level: 1 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 20 } },
      { moveId: "bleakwind-storm", method: { kind: "level-up", level: 35 } },
      { moveId: "hurricane", method: { kind: "level-up", level: 45 } },
      { moveId: "crunch", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-moth",
    generation: 9,
    entries: [
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 20 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 35 } },
      { moveId: "fire-blast", method: { kind: "level-up", level: 45 } },
      { moveId: "energy-ball", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-thorns",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 20 } },
      { moveId: "thunder-fang", method: { kind: "level-up", level: 35 } },
      { moveId: "stone-edge", method: { kind: "level-up", level: 45 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "frigibax",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "arctibax",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 40 } },
      { moveId: "ice-fang", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "baxcalibur",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "ice-fang", method: { kind: "level-up", level: 1 } },
      { moveId: "glaive-rush", method: { kind: "level-up", level: 56 } },
      { moveId: "icicle-crash", method: { kind: "level-up", level: 58 } },
    ],
  },
  {
    pokemonId: "gimmighoul",
    generation: 9,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "confuse-ray", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "gholdengo",
    generation: 9,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "confuse-ray", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-sound", method: { kind: "level-up", level: 44 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 48 } },
      { moveId: "make-it-rain", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "wo-chien",
    generation: 9,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "leaf-storm", method: { kind: "level-up", level: 30 } },
      { moveId: "crunch", method: { kind: "level-up", level: 40 } },
      { moveId: "ruination", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "chien-pao",
    generation: 9,
    entries: [
      { moveId: "powder-snow", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "icicle-crash", method: { kind: "level-up", level: 30 } },
      { moveId: "crunch", method: { kind: "level-up", level: 40 } },
      { moveId: "ruination", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "ting-lu",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 30 } },
      { moveId: "crunch", method: { kind: "level-up", level: 40 } },
      { moveId: "ruination", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "chi-yu",
    generation: 9,
    entries: [
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 30 } },
      { moveId: "crunch", method: { kind: "level-up", level: 40 } },
      { moveId: "ruination", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "roaring-moon",
    generation: 9,
    entries: [
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "crunch", method: { kind: "level-up", level: 20 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 35 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 45 } },
      { moveId: "dragon-rush", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-valiant",
    generation: 9,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "karate-chop", method: { kind: "level-up", level: 20 } },
      { moveId: "psycho-cut", method: { kind: "level-up", level: 35 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 45 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "koraidon",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "karate-chop", method: { kind: "level-up", level: 25 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 40 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 55 } },
      { moveId: "collision-course", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "miraidon",
    generation: 9,
    entries: [
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "spark", method: { kind: "level-up", level: 25 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 40 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 55 } },
      { moveId: "electro-drift", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "walking-wake",
    generation: 9,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "aqua-jet", method: { kind: "level-up", level: 20 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 35 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 45 } },
      { moveId: "draco-meteor", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-leaves",
    generation: 9,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "magical-leaf", method: { kind: "level-up", level: 20 } },
      { moveId: "psycho-cut", method: { kind: "level-up", level: 35 } },
      { moveId: "leaf-blade", method: { kind: "level-up", level: 45 } },
      { moveId: "psychic", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "dipplin",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 20 } },
      { moveId: "dragon-cheer", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "poltchageist",
    generation: 9,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "sinistcha",
    generation: 9,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "magical-leaf", method: { kind: "level-up", level: 44 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 48 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "okidogi",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "karate-chop", method: { kind: "level-up", level: 25 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 40 } },
      { moveId: "gunk-shot", method: { kind: "level-up", level: 50 } },
      { moveId: "drain-punch", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "munkidori",
    generation: 9,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 25 } },
      { moveId: "psychic", method: { kind: "level-up", level: 40 } },
      { moveId: "malignant-chain", method: { kind: "level-up", level: 50 } },
      { moveId: "focus-blast", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "fezandipiti",
    generation: 9,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 25 } },
      { moveId: "air-slash", method: { kind: "level-up", level: 40 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 50 } },
      { moveId: "psychic-noise", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "ogerpon",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leafage", method: { kind: "level-up", level: 1 } },
      { moveId: "razor-leaf", method: { kind: "level-up", level: 25 } },
      { moveId: "leaf-blade", method: { kind: "level-up", level: 40 } },
      { moveId: "ivy-cudgel", method: { kind: "level-up", level: 50 } },
      { moveId: "horn-leech", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "archaludon",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 20 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 30 } },
      { moveId: "flash-cannon", method: { kind: "level-up", level: 40 } },
      { moveId: "body-press", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "hydrapple",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-cheer", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 44 } },
      { moveId: "energy-ball", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "gouging-fire",
    generation: 9,
    entries: [
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "temper-flare", method: { kind: "level-up", level: 20 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 35 } },
      { moveId: "flare-blitz", method: { kind: "level-up", level: 45 } },
      { moveId: "dragon-rush", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "raging-bolt",
    generation: 9,
    entries: [
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "charge-beam", method: { kind: "level-up", level: 20 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 35 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 45 } },
      { moveId: "thunder", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-boulder",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 20 } },
      { moveId: "psycho-cut", method: { kind: "level-up", level: 35 } },
      { moveId: "stone-edge", method: { kind: "level-up", level: 45 } },
      { moveId: "psychic", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "iron-crown",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 20 } },
      { moveId: "psycho-cut", method: { kind: "level-up", level: 35 } },
      { moveId: "lumina-crash", method: { kind: "level-up", level: 45 } },
      { moveId: "flash-cannon", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "terapagos",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 25 } },
      { moveId: "body-press", method: { kind: "level-up", level: 40 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 50 } },
      { moveId: "giga-impact", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "pecharunt",
    generation: 9,
    entries: [
      { moveId: "lick", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 25 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 40 } },
      { moveId: "hex", method: { kind: "level-up", level: 50 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "wooper-paldea",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "tauros-paldea-combat",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "low-kick", method: { kind: "level-up", level: 15 } },
      { moveId: "karate-chop", method: { kind: "level-up", level: 25 } },
      { moveId: "raging-bull", method: { kind: "level-up", level: 35 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "tauros-paldea-blaze",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 15 } },
      { moveId: "low-kick", method: { kind: "level-up", level: 25 } },
      { moveId: "raging-bull", method: { kind: "level-up", level: 35 } },
      { moveId: "flare-blitz", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "tauros-paldea-aqua",
    generation: 9,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 15 } },
      { moveId: "low-kick", method: { kind: "level-up", level: 25 } },
      { moveId: "raging-bull", method: { kind: "level-up", level: 35 } },
      { moveId: "waterfall", method: { kind: "level-up", level: 45 } },
    ],
  },
];
