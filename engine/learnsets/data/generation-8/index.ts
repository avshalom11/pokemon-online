import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Generation 8 (Galar Moves & Learnsets Phase 3) — one single file in
// National Dex order, the same shape Generation 2-7's own index.ts files
// already established (never split per-species like Generation 1).
//
// Level-up-only entries, no TM/tutor/egg/event data — out of scope for this
// phase, same as every existing generation. Levels are approximate, chosen
// to read as a sensible progression (2-9 entries per species), matching the
// density Generation 2-7 already use. Entries are drawn from the FULL move
// database (every generation 1-8 move), not restricted to Generation 8's
// own 65 new moves — a Galar species can legitimately know an older move
// when thematically appropriate, same as every prior generation.
//
// Every evolved stage repeats its own pre-evolution's moves at level 1 (the
// same "Torterra already knows everything Turtwig had" precedent every
// prior generation's file already established), then adds new moves at
// levels comfortably above the species' own evolution threshold from
// data/pokemon/pokemon-evolutions.ts (Galar Phase 2) — never colliding with
// it. Species reached only via evolution-item (Alcremie, Galarian
// Slowking, Galarian Darmanitan) or a Branch target (Flapple/Appletun) have
// no real level floor of their own (see engine/evolution-stage-scaling's
// own "evolution-item/Branch targets are fully unrestricted" rule) — their
// own entries are still leveled for flavor, exactly like Roserade/Weavile/
// Togekiss already are in earlier generations.
//
// ==========================================================================
// Galarian Forms and their new Generation 8 evolution targets
// ==========================================================================
// The 19 Galarian Forms (bases in generation-1/2/3/5-pokemon-data.ts) are
// each their own independent, explicit static learnset — never runtime
// inheritance from their ordinary (non-Galarian) counterpart, the same
// architectural decision Alolan Forms already established in Alola Phase
// 3. Six Galarian Forms evolve into a genuinely NEW Generation 8 base
// species (Galar Phase 2): meowth-galar -> perrserker, corsola-galar ->
// cursola, farfetchd-galar -> sirfetchd, mr-mime-galar -> mr-rime,
// linoone-galar -> obstagoon, yamask-galar -> runerigus. Each of those six
// evolved-target learnsets repeats its own Galarian-Form pre-evolution's
// moves at level 1 and adds new moves above that evolution's real
// threshold, the exact same chain convention as every other evolution line
// in this file — never accidentally repeating the ORDINARY (non-Galarian)
// counterpart's moves, since Perrserker/Cursola/Sirfetch'd/Mr. Rime/
// Obstagoon/Runerigus are only ever reachable from their Galarian-Form
// pre-evolution (Galar Phase 2's own explicit scope — ordinary Meowth/
// Corsola/Farfetch'd/Mr. Mime/Linoone/Yamask never gain these evolutions).
export const GENERATION_8_LEARNSETS: PokemonLearnset[] = [
  {
    pokemonId: "grookey",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "branch-poke", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "thwackey",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "branch-poke", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "drum-beating", method: { kind: "level-up", level: 20 } },
      { moveId: "grassy-glide", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "rillaboom",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "branch-poke", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "drum-beating", method: { kind: "level-up", level: 1 } },
      { moveId: "grassy-glide", method: { kind: "level-up", level: 1 } },
      { moveId: "seed-bomb", method: { kind: "level-up", level: 40 } },
      { moveId: "solar-blade", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "scorbunny",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "raboot",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "flame-charge", method: { kind: "level-up", level: 20 } },
      { moveId: "double-kick", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "cinderace",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "flame-charge", method: { kind: "level-up", level: 1 } },
      { moveId: "double-kick", method: { kind: "level-up", level: 1 } },
      { moveId: "pyro-ball", method: { kind: "level-up", level: 40 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "sobble",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "drizzile",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "flip-turn", method: { kind: "level-up", level: 20 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "inteleon",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "flip-turn", method: { kind: "level-up", level: 1 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 1 } },
      { moveId: "snipe-shot", method: { kind: "level-up", level: 40 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "skwovet",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "greedent",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 30 } },
      { moveId: "crunch", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "rookidee",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "peck", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "corvisquire",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "pluck", method: { kind: "level-up", level: 22 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "corviknight",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "pluck", method: { kind: "level-up", level: 1 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 42 } },
      { moveId: "brave-bird", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "blipbug",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "dottler",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 14 } },
      { moveId: "light-screen", method: { kind: "level-up", level: 22 } },
    ],
  },
  {
    pokemonId: "orbeetle",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "light-screen", method: { kind: "level-up", level: 1 } },
      { moveId: "psychic", method: { kind: "level-up", level: 34 } },
      { moveId: "reflect", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "nickit",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "thievul",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "foul-play", method: { kind: "level-up", level: 24 } },
      { moveId: "crunch", method: { kind: "level-up", level: 32 } },
    ],
  },
  {
    pokemonId: "gossifleur",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "eldegoss",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "cotton-guard", method: { kind: "level-up", level: 26 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "wooloo",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "defense-curl", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "dubwool",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "defense-curl", method: { kind: "level-up", level: 1 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 30 } },
      { moveId: "double-edge", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "chewtle",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "drednaw",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-slide", method: { kind: "level-up", level: 28 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 34 } },
      { moveId: "crunch", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "yamper",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "boltund",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 30 } },
      { moveId: "wild-charge", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "rolycoly",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "carkol",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 22 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "coalossal",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 1 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 40 } },
      { moveId: "stone-edge", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "applin",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "withdraw", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "flapple",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 30 } },
      { moveId: "aerial-ace", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "appletun",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 30 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "silicobra",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "sandaconda",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "dig", method: { kind: "level-up", level: 40 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "cramorant",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "gust", method: { kind: "level-up", level: 8 } },
      { moveId: "surf", method: { kind: "level-up", level: 22 } },
    ],
  },
  {
    pokemonId: "arrokuda",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "barraskewda",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "waterfall", method: { kind: "level-up", level: 30 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "toxel",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "toxtricity",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "discharge", method: { kind: "level-up", level: 36 } },
      { moveId: "overdrive", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "sizzlipede",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "centiskorch",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "flame-wheel", method: { kind: "level-up", level: 32 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "clobbopus",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "grapploct",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 1 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 40 } },
      { moveId: "submission", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "sinistea",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "polteageist",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 38 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "hatenna",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "hattrem",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 36 } },
      { moveId: "calm-mind", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "hatterene",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 1 } },
      { moveId: "calm-mind", method: { kind: "level-up", level: 1 } },
      { moveId: "psychic", method: { kind: "level-up", level: 46 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "impidimp",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "morgrem",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "sucker-punch", method: { kind: "level-up", level: 36 } },
      { moveId: "play-rough", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "grimmsnarl",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "sucker-punch", method: { kind: "level-up", level: 1 } },
      { moveId: "play-rough", method: { kind: "level-up", level: 1 } },
      { moveId: "crunch", method: { kind: "level-up", level: 46 } },
      { moveId: "foul-play", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "obstagoon",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "faint-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "throat-chop", method: { kind: "level-up", level: 1 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 40 } },
      { moveId: "facade", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "perrserker",
    generation: 8,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 34 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 42 } },
    ],
  },
  {
    pokemonId: "cursola",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 42 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "sirfetchd",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 36 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "mr-rime",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "icy-wind", method: { kind: "level-up", level: 46 } },
      { moveId: "psychic", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "runerigus",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "earth-power", method: { kind: "level-up", level: 38 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "milcery",
    generation: 8,
    entries: [
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "disarming-voice", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "alcremie",
    generation: 8,
    entries: [
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "disarming-voice", method: { kind: "level-up", level: 1 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 30 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "falinks",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 1 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 30 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "pincurchin",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "discharge", method: { kind: "level-up", level: 28 } },
      { moveId: "zap-cannon", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "snom",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "frosmoth",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "icy-wind", method: { kind: "level-up", level: 22 } },
      { moveId: "bug-buzz", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "stonjourner",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-slide", method: { kind: "level-up", level: 28 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "eiscue",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "icicle-crash", method: { kind: "level-up", level: 28 } },
      { moveId: "ice-beam", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "indeedee",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "psychic", method: { kind: "level-up", level: 28 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "morpeko",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "aura-wheel", method: { kind: "level-up", level: 24 } },
      { moveId: "crunch", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "cufant",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "copperajah",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 38 } },
      { moveId: "superpower", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "dracozolt",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "wild-charge", method: { kind: "level-up", level: 30 } },
      { moveId: "dragon-rush", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "arctozolt",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "icy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "wild-charge", method: { kind: "level-up", level: 30 } },
      { moveId: "blizzard", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "dracovish",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 30 } },
      { moveId: "dragon-rush", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "arctovish",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "icy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "liquidation", method: { kind: "level-up", level: 30 } },
      { moveId: "ice-beam", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "duraludon",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 28 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "dreepy",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "drakloak",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-sneak", method: { kind: "level-up", level: 52 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 56 } },
    ],
  },
  {
    pokemonId: "dragapult",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-sneak", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 64 } },
      { moveId: "draco-meteor", method: { kind: "level-up", level: 68 } },
    ],
  },
  {
    pokemonId: "zacian",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "play-rough", method: { kind: "level-up", level: 30 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "zamazenta",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 30 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "eternatus",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 30 } },
      { moveId: "dynamax-cannon", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "kubfu",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "urshifu",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 1 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 44 } },
      { moveId: "wicked-blow", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "zarude",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 30 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "regieleki",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "wild-charge", method: { kind: "level-up", level: 30 } },
      { moveId: "thunder", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "regidrago",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 30 } },
      { moveId: "draco-meteor", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "glastrier",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "icicle-crash", method: { kind: "level-up", level: 30 } },
      { moveId: "blizzard", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "spectrier",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 30 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "calyrex",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 30 } },
      { moveId: "psychic", method: { kind: "level-up", level: 45 } },
    ],
  },

  // ==========================================================================
  // GALARIAN FORMS — 19 explicit static learnsets. See this file's own
  // header comment for the full rationale.
  // ==========================================================================
  {
    pokemonId: "meowth-galar",
    generation: 8,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "ponyta-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "rapidash-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 44 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "slowpoke-galar",
    generation: 8,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "withdraw", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "slowbro-galar",
    generation: 8,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 40 } },
      { moveId: "psychic", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "farfetchd-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "weezing-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "smokescreen", method: { kind: "level-up", level: 1 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 30 } },
      { moveId: "disarming-voice", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "mr-mime-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "articuno-galar",
    generation: 8,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "gust", method: { kind: "level-up", level: 1 } },
      { moveId: "psychic", method: { kind: "level-up", level: 30 } },
      { moveId: "hurricane", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "zapdos-galar",
    generation: 8,
    entries: [
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "close-combat", method: { kind: "level-up", level: 30 } },
      { moveId: "brave-bird", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "moltres-galar",
    generation: 8,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 30 } },
      { moveId: "hurricane", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "slowking-galar",
    generation: 8,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "withdraw", method: { kind: "level-up", level: 1 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 30 } },
      { moveId: "psychic", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "corsola-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "zigzagoon-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "linoone-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "faint-attack", method: { kind: "level-up", level: 24 } },
      { moveId: "throat-chop", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "darumaka-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "darmanitan-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "ice-fang", method: { kind: "level-up", level: 30 } },
      { moveId: "icicle-crash", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "yamask-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "stunfisk-galar",
    generation: 8,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 30 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 40 } },
    ],
  },
];
