import type { PokemonLearnset } from "../../types/learnset.types.ts";

// Generation 6 (Kalos Moves & Learnsets Phase 3) — one single file in
// National Dex order, the same shape Generation 2/3/4/5's own index.ts
// files already established (never split per-species like Generation 1).
//
// Level-up-only entries, no TM/tutor/egg/event data — out of scope for this
// phase, same as every existing generation. Levels are approximate, chosen
// to read as a sensible progression (2-9 entries per species), matching the
// density Generation 2-5 already use. Entries are drawn from the FULL move
// database (every generation 1-6 move), not restricted to Generation 6's
// own new moves — a Kalos species can legitimately know an older move when
// thematically appropriate, same as Ambipom (Generation 4) knowing
// Generation 1/2 moves.
//
// Every evolved stage repeats its own pre-evolution's moves at level 1 (the
// same "Torterra already knows everything Turtwig had" precedent every
// prior generation's file already established), then adds new moves at
// levels comfortably above the species' own evolution threshold from
// data/pokemon/pokemon-evolutions.ts (Kalos Phase 2) — never colliding with
// it. Species reached only via evolution-item (Florges, Aegislash,
// Aromatisse, Slurpuff, Heliolisk, Sylveon) have no real level floor of
// their own (see engine/evolution-stage-scaling's own "evolution-item
// targets are fully unrestricted" rule) — their own entries are still
// leveled for flavor, exactly like Roserade/Weavile/Togekiss already are in
// earlier generations, but nothing in the engine enforces that floor.
//
// Hoopa (base/Confined Form) and Hoopa Unbound (features/pokemon/forms) are
// each their own independent learnset, keyed by their exact Forms-catalog
// id (data/pokemon/generation-6-pokemon-data.ts) — sharing their early
// moves (both are the same species learning to fight) but Hoopa Unbound
// gains a distinct late-game identity (Dark-type coverage culminating in
// its own signature Hyperspace Fury) instead of Hoopa's Psychic-leaning
// kit, the same "never byte-for-byte identical between forms" rule
// Rotom/Giratina/Kyurem/Meloetta/Keldeo already established. No Prison
// Bottle mechanic and no runtime form-switching are implemented — Hoopa
// Unbound is simply a second, independently leveled species entry.
export const GENERATION_6_LEARNSETS: PokemonLearnset[] = [
  {
    pokemonId: "chespin",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "vine-whip", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "quilladin",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "take-down", method: { kind: "level-up", level: 22 } },
      { moveId: "seed-bomb", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "chesnaught",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "take-down", method: { kind: "level-up", level: 1 } },
      { moveId: "seed-bomb", method: { kind: "level-up", level: 1 } },
      { moveId: "spiky-shield", method: { kind: "level-up", level: 36 } },
      { moveId: "drain-punch", method: { kind: "level-up", level: 46 } },
      { moveId: "wood-hammer", method: { kind: "level-up", level: 56 } },
    ],
  },
  {
    pokemonId: "fennekin",
    generation: 6,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "braixen",
    generation: 6,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "flame-charge", method: { kind: "level-up", level: 20 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "delphox",
    generation: 6,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "tail-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "flame-charge", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 1 } },
      { moveId: "mystical-fire", method: { kind: "level-up", level: 36 } },
      { moveId: "fire-blast", method: { kind: "level-up", level: 46 } },
      { moveId: "psychic", method: { kind: "level-up", level: 56 } },
    ],
  },
  {
    pokemonId: "froakie",
    generation: 6,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "frogadier",
    generation: 6,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 20 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "greninja",
    generation: 6,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 1 } },
      { moveId: "water-shuriken", method: { kind: "level-up", level: 36 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 46 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 56 } },
    ],
  },
  {
    pokemonId: "bunnelby",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "diggersby",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 20 } },
      { moveId: "double-slap", method: { kind: "level-up", level: 25 } },
    ],
  },
  {
    pokemonId: "fletchling",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "peck", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "fletchinder",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 20 } },
      { moveId: "flame-charge", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "talonflame",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "flame-charge", method: { kind: "level-up", level: 1 } },
      { moveId: "acrobatics", method: { kind: "level-up", level: 35 } },
      { moveId: "flare-blitz", method: { kind: "level-up", level: 46 } },
      { moveId: "brave-bird", method: { kind: "level-up", level: 56 } },
    ],
  },
  {
    pokemonId: "scatterbug",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "spewpa",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 9 } },
    ],
  },
  {
    pokemonId: "vivillon",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "gust", method: { kind: "level-up", level: 12 } },
      { moveId: "poison-powder", method: { kind: "level-up", level: 20 } },
      { moveId: "bug-buzz", method: { kind: "level-up", level: 35 } },
      { moveId: "hurricane", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "litleo",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "pyroar",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "noble-roar", method: { kind: "level-up", level: 35 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 45 } },
      { moveId: "hyper-voice", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "flabebe",
    generation: 6,
    entries: [
      { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "floette",
    generation: 6,
    entries: [
      { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "wish", method: { kind: "level-up", level: 19 } },
    ],
  },
  {
    pokemonId: "florges",
    generation: 6,
    entries: [
      { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "wish", method: { kind: "level-up", level: 1 } },
      { moveId: "petal-blizzard", method: { kind: "level-up", level: 1 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 40 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "skiddo",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "vine-whip", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "gogoat",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "vine-whip", method: { kind: "level-up", level: 1 } },
      { moveId: "take-down", method: { kind: "level-up", level: 32 } },
      { moveId: "horn-attack", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "pancham",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "low-kick", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "pangoro",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "low-kick", method: { kind: "level-up", level: 1 } },
      { moveId: "crunch", method: { kind: "level-up", level: 32 } },
      { moveId: "hammer-arm", method: { kind: "level-up", level: 42 } },
      { moveId: "focus-punch", method: { kind: "level-up", level: 52 } },
    ],
  },
  {
    pokemonId: "furfrou",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 10 } },
      { moveId: "take-down", method: { kind: "level-up", level: 20 } },
      { moveId: "agility", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "espurr",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "meowstic",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 25 } },
      { moveId: "light-screen", method: { kind: "level-up", level: 33 } },
      { moveId: "psychic", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "honedge",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "autotomize", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "doublade",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "autotomize", method: { kind: "level-up", level: 1 } },
      { moveId: "slash", method: { kind: "level-up", level: 35 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "aegislash",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "autotomize", method: { kind: "level-up", level: 1 } },
      { moveId: "slash", method: { kind: "level-up", level: 1 } },
      { moveId: "night-slash", method: { kind: "level-up", level: 1 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 50 } },
      { moveId: "iron-head", method: { kind: "level-up", level: 60 } },
      { moveId: "kings-shield", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "spritzee",
    generation: 6,
    entries: [
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "sweet-scent", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "aromatisse",
    generation: 6,
    entries: [
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "sweet-scent", method: { kind: "level-up", level: 1 } },
      { moveId: "draining-kiss", method: { kind: "level-up", level: 1 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 50 } },
      { moveId: "calm-mind", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "swirlix",
    generation: 6,
    entries: [
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "sweet-scent", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "slurpuff",
    generation: 6,
    entries: [
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "sweet-scent", method: { kind: "level-up", level: 1 } },
      { moveId: "play-rough", method: { kind: "level-up", level: 1 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 50 } },
      { moveId: "belly-drum", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "inkay",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "malamar",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 1 } },
      { moveId: "foul-play", method: { kind: "level-up", level: 30 } },
      { moveId: "psycho-cut", method: { kind: "level-up", level: 40 } },
      { moveId: "superpower", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "binacle",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "barbaracle",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 1 } },
      { moveId: "brine", method: { kind: "level-up", level: 39 } },
      { moveId: "stone-edge", method: { kind: "level-up", level: 48 } },
      { moveId: "razor-shell", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "skrelp",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "dragalge",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "gunk-shot", method: { kind: "level-up", level: 48 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 55 } },
      { moveId: "sludge-wave", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "clauncher",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "clawitzer",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 37 } },
      { moveId: "crabhammer", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "helioptile",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "heliolisk",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "parabolic-charge", method: { kind: "level-up", level: 1 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 50 } },
      { moveId: "bulldoze", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "tyrunt",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "tyrantrum",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 39 } },
      { moveId: "crunch", method: { kind: "level-up", level: 48 } },
      { moveId: "giga-impact", method: { kind: "level-up", level: 58 } },
    ],
  },
  {
    pokemonId: "amaura",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "aurorus",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 1 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 39 } },
      { moveId: "ice-beam", method: { kind: "level-up", level: 48 } },
      { moveId: "blizzard", method: { kind: "level-up", level: 58 } },
    ],
  },
  {
    pokemonId: "sylveon",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 1 } },
      { moveId: "draining-kiss", method: { kind: "level-up", level: 30 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 50 } },
      { moveId: "calm-mind", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "hawlucha",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "karate-chop", method: { kind: "level-up", level: 10 } },
      { moveId: "flying-press", method: { kind: "level-up", level: 30 } },
      { moveId: "acrobatics", method: { kind: "level-up", level: 45 } },
      { moveId: "brave-bird", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "dedenne",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 10 } },
      { moveId: "nuzzle", method: { kind: "level-up", level: 20 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 35 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 45 } },
    ],
  },
  {
    pokemonId: "carbink",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 10 } },
      { moveId: "reflect", method: { kind: "level-up", level: 20 } },
      { moveId: "power-gem", method: { kind: "level-up", level: 30 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "goomy",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "sliggoo",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 40 } },
      { moveId: "muddy-water", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "goodra",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 1 } },
      { moveId: "muddy-water", method: { kind: "level-up", level: 1 } },
      { moveId: "dragon-pulse", method: { kind: "level-up", level: 50 } },
      { moveId: "draco-meteor", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "klefki",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "fairy-wind", method: { kind: "level-up", level: 10 } },
      { moveId: "imprison", method: { kind: "level-up", level: 20 } },
      { moveId: "flash-cannon", method: { kind: "level-up", level: 30 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "phantump",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "trevenant",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "phantom-force", method: { kind: "level-up", level: 35 } },
      { moveId: "horn-leech", method: { kind: "level-up", level: 45 } },
      { moveId: "wood-hammer", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "pumpkaboo",
    generation: 6,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "gourgeist",
    generation: 6,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "trick-or-treat", method: { kind: "level-up", level: 35 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 45 } },
      { moveId: "seed-bomb", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "bergmite",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "avalugg",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 1 } },
      { moveId: "avalanche", method: { kind: "level-up", level: 37 } },
      { moveId: "blizzard", method: { kind: "level-up", level: 50 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "noibat",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "gust", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "noivern",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "gust", method: { kind: "level-up", level: 1 } },
      { moveId: "air-slash", method: { kind: "level-up", level: 48 } },
      { moveId: "boomburst", method: { kind: "level-up", level: 58 } },
    ],
  },
  {
    pokemonId: "xerneas",
    generation: 6,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "take-down", method: { kind: "level-up", level: 1 } },
      { moveId: "geomancy", method: { kind: "level-up", level: 45 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 55 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "yveltal",
    generation: 6,
    entries: [
      { moveId: "gust", method: { kind: "level-up", level: 1 } },
      { moveId: "oblivion-wing", method: { kind: "level-up", level: 45 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 55 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "zygarde",
    generation: 6,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "bind", method: { kind: "level-up", level: 1 } },
      { moveId: "lands-wrath", method: { kind: "level-up", level: 45 } },
      { moveId: "thousand-arrows", method: { kind: "level-up", level: 55 } },
      { moveId: "thousand-waves", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "diancie",
    generation: 6,
    entries: [
      { moveId: "rock-throw", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "moonblast", method: { kind: "level-up", level: 45 } },
      { moveId: "diamond-storm", method: { kind: "level-up", level: 55 } },
      { moveId: "dazzling-gleam", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "hoopa",
    generation: 6,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 30 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 45 } },
      { moveId: "hyperspace-hole", method: { kind: "level-up", level: 55 } },
      { moveId: "psychic", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "hoopa-unbound",
    generation: 6,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "dark-pulse", method: { kind: "level-up", level: 30 } },
      { moveId: "crunch", method: { kind: "level-up", level: 45 } },
      { moveId: "hyperspace-fury", method: { kind: "level-up", level: 55 } },
      { moveId: "focus-blast", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "volcanion",
    generation: 6,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "smog", method: { kind: "level-up", level: 1 } },
      { moveId: "steam-eruption", method: { kind: "level-up", level: 50 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 60 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 70 } },
    ],
  },
];
