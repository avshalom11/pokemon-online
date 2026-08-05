import type { PokemonLearnset } from "../../types/learnset.types.ts";

// ============================================================================
// Generation 3 (Hoenn, #252-#386) level-up learnsets — Hoenn Moves &
// Learnsets Phase 3.
// ============================================================================
//
// Same "modern learnset, filtered/simplified to what this project's move
// database actually supports" convention generation-1/index.ts and
// generation-2/index.ts's own top-of-file notes already established — NOT a
// verbatim transcription of the original 2002 Ruby/Sapphire level-up data.
// Concretely:
//
//   - Every entry here is a real, thematically-appropriate level-up move for
//     that species, drawn overwhelmingly from the existing Generation 1/2
//     move database plus the new Generation 3 moves this same phase added
//     (engine/moves/data/generation-3) — used wherever a genuinely
//     Generation-3-introduced move (Leaf Blade, Dragon Claw, Calm Mind,
//     Overheat, Meteor Mash, ...) was the clearly better fit for that
//     species' own signature moves.
//   - Levels are approximate, not a byte-for-byte transcription of any one
//     game version — chosen to read as a sensible progression (an early STAB
//     move, a mid-game secondary-effect move, a late strong move), matching
//     Generation 1/2's own density (5-9 entries per species).
//   - Kept intentionally compact, one big file organized in National Dex
//     order — same shape Generation 2 already chose over Generation 1's
//     one-file-per-species split, and for the same reason (100+ files of
//     ~10 lines each add navigation overhead without a real benefit).
//   - Level-up only (method: { kind: "level-up" }) — same as every existing
//     Generation 1/2 entry; TM/tutor/egg moves are out of scope for this
//     phase.
//   - Deoxys is FOUR separate learnset entries (deoxys, deoxys-attack,
//     deoxys-defense, deoxys-speed — see features/pokemon/forms's own Forms
//     architecture), each tuned to that form's own stat spread: Attack Form
//     leans into its own huge Attack/Special Attack with heavier-hitting
//     moves at the same levels Normal Form gets lighter ones; Defense Form
//     leans into stalling/defensive stat moves; Speed Form gets its
//     signature moves slightly earlier, reflecting its own faster,
//     lower-bulk playstyle. All four still share the same overall level
//     curve so none is simply "better," just differently specialized.
//   - Castform has exactly one learnset entry — no Sunny/Rainy/Snowy
//     alternate-form entries exist (Phase 1's own species-catalog decision:
//     no form-specific sprite assets exist on disk yet, so no
//     castform-sunny/-rainy/-snowy species rows were ever created — a
//     learnset needs a real species row to attach to).
export const GENERATION_3_LEARNSETS: PokemonLearnset[] = [
  {
    pokemonId: "treecko",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 6 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 12 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 19 } },
      { moveId: "leaf-blade", method: { kind: "level-up", level: 27 } },
      { moveId: "screech", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "grovyle",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 12 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 21 } },
      { moveId: "leaf-blade", method: { kind: "level-up", level: 30 } },
      { moveId: "agility", method: { kind: "level-up", level: 39 } },
    ],
  },
  {
    pokemonId: "sceptile",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 12 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 21 } },
      { moveId: "leaf-blade", method: { kind: "level-up", level: 30 } },
      { moveId: "agility", method: { kind: "level-up", level: 42 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "torchic",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 6 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 12 } },
      { moveId: "fire-punch", method: { kind: "level-up", level: 19 } },
      { moveId: "sky-uppercut", method: { kind: "level-up", level: 27 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "combusken",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 12 } },
      { moveId: "fire-punch", method: { kind: "level-up", level: 21 } },
      { moveId: "sky-uppercut", method: { kind: "level-up", level: 30 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 39 } },
    ],
  },
  {
    pokemonId: "blaziken",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 12 } },
      { moveId: "fire-punch", method: { kind: "level-up", level: 21 } },
      { moveId: "sky-uppercut", method: { kind: "level-up", level: 30 } },
      { moveId: "blaze-kick", method: { kind: "level-up", level: 42 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "mudkip",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 6 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 12 } },
      { moveId: "take-down", method: { kind: "level-up", level: 19 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 27 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "marshtomp",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 12 } },
      { moveId: "take-down", method: { kind: "level-up", level: 21 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 30 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 39 } },
    ],
  },
  {
    pokemonId: "swampert",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 12 } },
      { moveId: "take-down", method: { kind: "level-up", level: 21 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 30 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 42 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "poochyena",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "howl", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 9 } },
      { moveId: "screech", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "mightyena",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "howl", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 9 } },
      { moveId: "screech", method: { kind: "level-up", level: 16 } },
      { moveId: "taunt", method: { kind: "level-up", level: 24 } },
      { moveId: "crunch", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "zigzagoon",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "headbutt", method: { kind: "level-up", level: 9 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "linoone",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "headbutt", method: { kind: "level-up", level: 9 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 13 } },
      { moveId: "covet", method: { kind: "level-up", level: 20 } },
      { moveId: "slash", method: { kind: "level-up", level: 28 } },
      { moveId: "double-edge", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "wurmple",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "silcoon",
    generation: 3,
    entries: [
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "beautifly",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 12 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 20 } },
      { moveId: "silver-wind", method: { kind: "level-up", level: 28 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "cascoon",
    generation: 3,
    entries: [
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "dustox",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "string-shot", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 12 } },
      { moveId: "confuse-ray", method: { kind: "level-up", level: 20 } },
      { moveId: "silver-wind", method: { kind: "level-up", level: 28 } },
      { moveId: "sludge", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "lotad",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "lombre",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 15 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 23 } },
    ],
  },
  {
    pokemonId: "ludicolo",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 15 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 23 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 33 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "seedot",
    generation: 3,
    entries: [
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "bide", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "nuzleaf",
    generation: 3,
    entries: [
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "bide", method: { kind: "level-up", level: 1 } },
      { moveId: "razor-leaf", method: { kind: "level-up", level: 15 } },
      { moveId: "screech", method: { kind: "level-up", level: 23 } },
    ],
  },
  {
    pokemonId: "shiftry",
    generation: 3,
    entries: [
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "bide", method: { kind: "level-up", level: 1 } },
      { moveId: "razor-leaf", method: { kind: "level-up", level: 15 } },
      { moveId: "extrasensory", method: { kind: "level-up", level: 26 } },
      { moveId: "taunt", method: { kind: "level-up", level: 34 } },
      { moveId: "leaf-blade", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "taillow",
    generation: 3,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 9 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "swellow",
    generation: 3,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 9 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 16 } },
      { moveId: "double-team", method: { kind: "level-up", level: 24 } },
      { moveId: "aerial-ace", method: { kind: "level-up", level: 32 } },
      { moveId: "sky-attack", method: { kind: "level-up", level: 42 } },
    ],
  },
  {
    pokemonId: "wingull",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 4 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 9 } },
    ],
  },
  {
    pokemonId: "pelipper",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 4 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 9 } },
      { moveId: "wing-attack", method: { kind: "level-up", level: 18 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 27 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "ralts",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 6 } },
      { moveId: "double-team", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "kirlia",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "double-team", method: { kind: "level-up", level: 12 } },
      { moveId: "calm-mind", method: { kind: "level-up", level: 22 } },
    ],
  },
  {
    pokemonId: "gardevoir",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "double-team", method: { kind: "level-up", level: 12 } },
      { moveId: "calm-mind", method: { kind: "level-up", level: 22 } },
      { moveId: "psychic", method: { kind: "level-up", level: 32 } },
      { moveId: "extrasensory", method: { kind: "level-up", level: 42 } },
    ],
  },
  {
    pokemonId: "surskit",
    generation: 3,
    entries: [
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "masquerain",
    generation: 3,
    entries: [
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 8 } },
      { moveId: "gust", method: { kind: "level-up", level: 16 } },
      { moveId: "signal-beam", method: { kind: "level-up", level: 26 } },
      { moveId: "air-cutter", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "shroomish",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 8 } },
      { moveId: "stun-spore", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "breloom",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "stun-spore", method: { kind: "level-up", level: 13 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 20 } },
      { moveId: "sky-uppercut", method: { kind: "level-up", level: 28 } },
      { moveId: "bulk-up", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "slakoth",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "yawn", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "vigoroth",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "yawn", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 15 } },
      { moveId: "slash", method: { kind: "level-up", level: 27 } },
    ],
  },
  {
    pokemonId: "slaking",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "yawn", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 15 } },
      { moveId: "slash", method: { kind: "level-up", level: 27 } },
      { moveId: "covet", method: { kind: "level-up", level: 37 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "nincada",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "leech-life", method: { kind: "level-up", level: 9 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 15 } },
    ],
  },
  {
    pokemonId: "ninjask",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "leech-life", method: { kind: "level-up", level: 9 } },
      { moveId: "double-team", method: { kind: "level-up", level: 20 } },
      { moveId: "slash", method: { kind: "level-up", level: 30 } },
      { moveId: "agility", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "shedinja",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "leech-life", method: { kind: "level-up", level: 9 } },
      { moveId: "night-shade", method: { kind: "level-up", level: 20 } },
      { moveId: "shadow-punch", method: { kind: "level-up", level: 30 } },
      { moveId: "astonish", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "whismur",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "uproar", method: { kind: "level-up", level: 9 } },
      { moveId: "screech", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "loudred",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "uproar", method: { kind: "level-up", level: 1 } },
      { moveId: "screech", method: { kind: "level-up", level: 13 } },
      { moveId: "stomp", method: { kind: "level-up", level: 22 } },
      { moveId: "hyper-voice", method: { kind: "level-up", level: 32 } },
    ],
  },
  {
    pokemonId: "exploud",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "uproar", method: { kind: "level-up", level: 1 } },
      { moveId: "screech", method: { kind: "level-up", level: 13 } },
      { moveId: "stomp", method: { kind: "level-up", level: 22 } },
      { moveId: "hyper-voice", method: { kind: "level-up", level: 32 } },
      { moveId: "take-down", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "makuhita",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 8 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "hariyama",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 13 } },
      { moveId: "arm-thrust", method: { kind: "level-up", level: 22 } },
      { moveId: "belly-drum", method: { kind: "level-up", level: 32 } },
      { moveId: "superpower", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "azurill",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "charm", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "nosepass",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 10 } },
      { moveId: "block", method: { kind: "level-up", level: 18 } },
      { moveId: "rock-slide", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "skitty",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "sing", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "delcatty",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "sing", method: { kind: "level-up", level: 10 } },
      { moveId: "double-slap", method: { kind: "level-up", level: 20 } },
      { moveId: "double-edge", method: { kind: "level-up", level: 32 } },
    ],
  },
  {
    pokemonId: "sableye",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 9 } },
      { moveId: "fury-swipes", method: { kind: "level-up", level: 16 } },
      { moveId: "shadow-punch", method: { kind: "level-up", level: 25 } },
      { moveId: "knock-off", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "mawile",
    generation: 3,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 9 } },
      { moveId: "fake-tears", method: { kind: "level-up", level: 16 } },
      { moveId: "crunch", method: { kind: "level-up", level: 25 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "aron",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 9 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "lairon",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 9 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 16 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 25 } },
      { moveId: "take-down", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "aggron",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 9 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 16 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 25 } },
      { moveId: "take-down", method: { kind: "level-up", level: 34 } },
      { moveId: "meteor-mash", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "meditite",
    generation: 3,
    entries: [
      { moveId: "meditate", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 8 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "medicham",
    generation: 3,
    entries: [
      { moveId: "meditate", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-smash", method: { kind: "level-up", level: 13 } },
      { moveId: "bulk-up", method: { kind: "level-up", level: 22 } },
      { moveId: "psychic", method: { kind: "level-up", level: 32 } },
    ],
  },
  {
    pokemonId: "electrike",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-wave", method: { kind: "level-up", level: 8 } },
      { moveId: "shock-wave", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "manectric",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "thunder-wave", method: { kind: "level-up", level: 1 } },
      { moveId: "shock-wave", method: { kind: "level-up", level: 13 } },
      { moveId: "charge", method: { kind: "level-up", level: 22 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 32 } },
      { moveId: "thunder", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "plusle",
    generation: 3,
    entries: [
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "charm", method: { kind: "level-up", level: 1 } },
      { moveId: "spark", method: { kind: "level-up", level: 12 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "minun",
    generation: 3,
    entries: [
      { moveId: "thunder-shock", method: { kind: "level-up", level: 1 } },
      { moveId: "charm", method: { kind: "level-up", level: 1 } },
      { moveId: "spark", method: { kind: "level-up", level: 12 } },
      { moveId: "thunderbolt", method: { kind: "level-up", level: 30 } },
    ],
  },
  {
    pokemonId: "volbeat",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "double-team", method: { kind: "level-up", level: 9 } },
      { moveId: "tail-glow", method: { kind: "level-up", level: 16 } },
      { moveId: "signal-beam", method: { kind: "level-up", level: 25 } },
    ],
  },
  {
    pokemonId: "illumise",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "double-team", method: { kind: "level-up", level: 9 } },
      { moveId: "tail-glow", method: { kind: "level-up", level: 16 } },
      { moveId: "signal-beam", method: { kind: "level-up", level: 25 } },
    ],
  },
  {
    pokemonId: "roselia",
    generation: 3,
    entries: [
      { moveId: "absorb", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-sting", method: { kind: "level-up", level: 8 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 15 } },
      { moveId: "sludge", method: { kind: "level-up", level: 24 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "gulpin",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-gas", method: { kind: "level-up", level: 8 } },
      { moveId: "sludge", method: { kind: "level-up", level: 15 } },
    ],
  },
  {
    pokemonId: "swalot",
    generation: 3,
    entries: [
      { moveId: "pound", method: { kind: "level-up", level: 1 } },
      { moveId: "poison-gas", method: { kind: "level-up", level: 1 } },
      { moveId: "sludge", method: { kind: "level-up", level: 15 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 25 } },
      { moveId: "toxic", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "carvanha",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 8 } },
      { moveId: "screech", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "sharpedo",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "screech", method: { kind: "level-up", level: 13 } },
      { moveId: "crunch", method: { kind: "level-up", level: 24 } },
      { moveId: "slash", method: { kind: "level-up", level: 34 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "wailmer",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 6 } },
      { moveId: "rollout", method: { kind: "level-up", level: 13 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 24 } },
    ],
  },
  {
    pokemonId: "wailord",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 6 } },
      { moveId: "rollout", method: { kind: "level-up", level: 13 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 24 } },
      { moveId: "dive", method: { kind: "level-up", level: 34 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "numel",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 8 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "camerupt",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-slap", method: { kind: "level-up", level: 13 } },
      { moveId: "flame-wheel", method: { kind: "level-up", level: 22 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 32 } },
      { moveId: "eruption", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "torkoal",
    generation: 3,
    entries: [
      { moveId: "smog", method: { kind: "level-up", level: 1 } },
      { moveId: "ember", method: { kind: "level-up", level: 1 } },
      { moveId: "smokescreen", method: { kind: "level-up", level: 10 } },
      { moveId: "flame-wheel", method: { kind: "level-up", level: 20 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 30 } },
      { moveId: "flamethrower", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "spoink",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "psywave", method: { kind: "level-up", level: 8 } },
      { moveId: "confusion", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "grumpig",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "psywave", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 13 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 24 } },
      { moveId: "cosmic-power", method: { kind: "level-up", level: 34 } },
      { moveId: "psychic", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "spinda",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 9 } },
      { moveId: "teeter-dance", method: { kind: "level-up", level: 16 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 25 } },
    ],
  },
  {
    pokemonId: "trapinch",
    generation: 3,
    entries: [
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "vibrava",
    generation: 3,
    entries: [
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-tomb", method: { kind: "level-up", level: 18 } },
      { moveId: "twister", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "flygon",
    generation: 3,
    entries: [
      { moveId: "sand-attack", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "sand-tomb", method: { kind: "level-up", level: 18 } },
      { moveId: "twister", method: { kind: "level-up", level: 28 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 38 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 48 } },
    ],
  },
  {
    pokemonId: "cacnea",
    generation: 3,
    entries: [
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 8 } },
      { moveId: "needle-arm", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "cacturne",
    generation: 3,
    entries: [
      { moveId: "poison-sting", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "needle-arm", method: { kind: "level-up", level: 13 } },
      { moveId: "sand-attack", method: { kind: "level-up", level: 22 } },
      { moveId: "screech", method: { kind: "level-up", level: 32 } },
      { moveId: "crunch", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "swablu",
    generation: 3,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 6 } },
      { moveId: "astonish", method: { kind: "level-up", level: 12 } },
    ],
  },
  {
    pokemonId: "altaria",
    generation: 3,
    entries: [
      { moveId: "peck", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "astonish", method: { kind: "level-up", level: 12 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 22 } },
      { moveId: "dragon-dance", method: { kind: "level-up", level: 32 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "zangoose",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 9 } },
      { moveId: "fury-swipes", method: { kind: "level-up", level: 16 } },
      { moveId: "slash", method: { kind: "level-up", level: 25 } },
      { moveId: "crush-claw", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "seviper",
    generation: 3,
    entries: [
      { moveId: "wrap", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 9 } },
      { moveId: "poison-tail", method: { kind: "level-up", level: 16 } },
      { moveId: "crunch", method: { kind: "level-up", level: 25 } },
      { moveId: "sludge", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "lunatone",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 9 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 16 } },
      { moveId: "psywave", method: { kind: "level-up", level: 25 } },
      { moveId: "psychic", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "solrock",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 9 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 16 } },
      { moveId: "psywave", method: { kind: "level-up", level: 25 } },
      { moveId: "psychic", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "barboach",
    generation: 3,
    entries: [
      { moveId: "mud-slap", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 8 } },
    ],
  },
  {
    pokemonId: "whiscash",
    generation: 3,
    entries: [
      { moveId: "mud-slap", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 18 } },
      { moveId: "amnesia", method: { kind: "level-up", level: 28 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 40 } },
    ],
  },
  {
    pokemonId: "corphish",
    generation: 3,
    entries: [
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 9 } },
      { moveId: "vise-grip", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "crawdaunt",
    generation: 3,
    entries: [
      { moveId: "bubble", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "vise-grip", method: { kind: "level-up", level: 16 } },
      { moveId: "crabhammer", method: { kind: "level-up", level: 27 } },
      { moveId: "crunch", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "baltoy",
    generation: 3,
    entries: [
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 8 } },
      { moveId: "rock-tomb", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "claydol",
    generation: 3,
    entries: [
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "rock-tomb", method: { kind: "level-up", level: 13 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 24 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 34 } },
      { moveId: "psychic", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "lileep",
    generation: 3,
    entries: [
      { moveId: "constrict", method: { kind: "level-up", level: 1 } },
      { moveId: "acid", method: { kind: "level-up", level: 8 } },
      { moveId: "ingrain", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "cradily",
    generation: 3,
    entries: [
      { moveId: "constrict", method: { kind: "level-up", level: 1 } },
      { moveId: "acid", method: { kind: "level-up", level: 1 } },
      { moveId: "ingrain", method: { kind: "level-up", level: 13 } },
      { moveId: "mega-drain", method: { kind: "level-up", level: 22 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 32 } },
      { moveId: "giga-drain", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "anorith",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 8 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "armaldo",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 13 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 24 } },
      { moveId: "slash", method: { kind: "level-up", level: 34 } },
      { moveId: "crush-claw", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "feebas",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "tackle", method: { kind: "level-up", level: 5 } },
    ],
  },
  {
    pokemonId: "milotic",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 20 } },
      { moveId: "twister", method: { kind: "level-up", level: 30 } },
      { moveId: "recover", method: { kind: "level-up", level: 40 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "castform",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "weather-ball", method: { kind: "level-up", level: 15 } },
      { moveId: "hail", method: { kind: "level-up", level: 25 } },
      { moveId: "water-sport", method: { kind: "level-up", level: 25 } },
    ],
  },
  {
    pokemonId: "kecleon",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "lick", method: { kind: "level-up", level: 9 } },
      { moveId: "astonish", method: { kind: "level-up", level: 16 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 25 } },
      { moveId: "slash", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "shuppet",
    generation: 3,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "night-shade", method: { kind: "level-up", level: 9 } },
      { moveId: "curse", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "banette",
    generation: 3,
    entries: [
      { moveId: "astonish", method: { kind: "level-up", level: 1 } },
      { moveId: "night-shade", method: { kind: "level-up", level: 1 } },
      { moveId: "curse", method: { kind: "level-up", level: 16 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 26 } },
      { moveId: "grudge", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "duskull",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "night-shade", method: { kind: "level-up", level: 9 } },
      { moveId: "confuse-ray", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "dusclops",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "night-shade", method: { kind: "level-up", level: 1 } },
      { moveId: "confuse-ray", method: { kind: "level-up", level: 16 } },
      { moveId: "shadow-punch", method: { kind: "level-up", level: 26 } },
      { moveId: "curse", method: { kind: "level-up", level: 36 } },
      { moveId: "shadow-ball", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "tropius",
    generation: 3,
    entries: [
      { moveId: "growth", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 8 } },
      { moveId: "razor-leaf", method: { kind: "level-up", level: 16 } },
      { moveId: "sweet-scent", method: { kind: "level-up", level: 24 } },
      { moveId: "air-cutter", method: { kind: "level-up", level: 34 } },
      { moveId: "solar-beam", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "chimecho",
    generation: 3,
    entries: [
      { moveId: "growl", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 9 } },
      { moveId: "astonish", method: { kind: "level-up", level: 16 } },
      { moveId: "psybeam", method: { kind: "level-up", level: 25 } },
      { moveId: "psychic", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "absol",
    generation: 3,
    entries: [
      { moveId: "scratch", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 9 } },
      { moveId: "taunt", method: { kind: "level-up", level: 16 } },
      { moveId: "bite", method: { kind: "level-up", level: 25 } },
      { moveId: "slash", method: { kind: "level-up", level: 34 } },
      { moveId: "crunch", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "wynaut",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "charm", method: { kind: "level-up", level: 1 } },
      { moveId: "counter", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "snorunt",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 8 } },
      { moveId: "double-team", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "glalie",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 1 } },
      { moveId: "double-team", method: { kind: "level-up", level: 13 } },
      { moveId: "icy-wind", method: { kind: "level-up", level: 24 } },
      { moveId: "crunch", method: { kind: "level-up", level: 34 } },
      { moveId: "blizzard", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "spheal",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 8 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 13 } },
    ],
  },
  {
    pokemonId: "sealeo",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 13 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 24 } },
      { moveId: "ice-ball", method: { kind: "level-up", level: 34 } },
    ],
  },
  {
    pokemonId: "walrein",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "powder-snow", method: { kind: "level-up", level: 13 } },
      { moveId: "body-slam", method: { kind: "level-up", level: 24 } },
      { moveId: "ice-ball", method: { kind: "level-up", level: 34 } },
      { moveId: "blizzard", method: { kind: "level-up", level: 46 } },
    ],
  },
  {
    pokemonId: "clamperl",
    generation: 3,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "clamp", method: { kind: "level-up", level: 10 } },
    ],
  },
  {
    pokemonId: "huntail",
    generation: 3,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "clamp", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 20 } },
      { moveId: "crunch", method: { kind: "level-up", level: 32 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "gorebyss",
    generation: 3,
    entries: [
      { moveId: "water-gun", method: { kind: "level-up", level: 1 } },
      { moveId: "clamp", method: { kind: "level-up", level: 1 } },
      { moveId: "confuse-ray", method: { kind: "level-up", level: 20 } },
      { moveId: "psychic", method: { kind: "level-up", level: 32 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 44 } },
    ],
  },
  {
    pokemonId: "relicanth",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "harden", method: { kind: "level-up", level: 9 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 16 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 25 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 36 } },
    ],
  },
  {
    pokemonId: "luvdisc",
    generation: 3,
    entries: [
      { moveId: "splash", method: { kind: "level-up", level: 1 } },
      { moveId: "charm", method: { kind: "level-up", level: 8 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "bagon",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 9 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 16 } },
    ],
  },
  {
    pokemonId: "shelgon",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 16 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 26 } },
      { moveId: "crunch", method: { kind: "level-up", level: 38 } },
    ],
  },
  {
    pokemonId: "salamence",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "bite", method: { kind: "level-up", level: 1 } },
      { moveId: "focus-energy", method: { kind: "level-up", level: 16 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 26 } },
      { moveId: "crunch", method: { kind: "level-up", level: 38 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 50 } },
      { moveId: "dragon-dance", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "beldum",
    generation: 3,
    entries: [
      { moveId: "take-down", method: { kind: "level-up", level: 1 } },
    ],
  },
  {
    pokemonId: "metang",
    generation: 3,
    entries: [
      { moveId: "take-down", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 16 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 28 } },
    ],
  },
  {
    pokemonId: "metagross",
    generation: 3,
    entries: [
      { moveId: "take-down", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 28 } },
      { moveId: "psychic", method: { kind: "level-up", level: 38 } },
      { moveId: "meteor-mash", method: { kind: "level-up", level: 50 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "regirock",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "curse", method: { kind: "level-up", level: 15 } },
      { moveId: "rock-throw", method: { kind: "level-up", level: 25 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 35 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 45 } },
      { moveId: "rock-slide", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "regice",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "curse", method: { kind: "level-up", level: 15 } },
      { moveId: "icy-wind", method: { kind: "level-up", level: 25 } },
      { moveId: "amnesia", method: { kind: "level-up", level: 35 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 45 } },
      { moveId: "blizzard", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "registeel",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "curse", method: { kind: "level-up", level: 15 } },
      { moveId: "metal-claw", method: { kind: "level-up", level: 25 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 35 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 45 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "latias",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 15 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 25 } },
      { moveId: "recover", method: { kind: "level-up", level: 35 } },
      { moveId: "psychic", method: { kind: "level-up", level: 45 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "latios",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "confusion", method: { kind: "level-up", level: 15 } },
      { moveId: "dragon-breath", method: { kind: "level-up", level: 25 } },
      { moveId: "recover", method: { kind: "level-up", level: 35 } },
      { moveId: "psychic", method: { kind: "level-up", level: 45 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "kyogre",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 15 } },
      { moveId: "water-pulse", method: { kind: "level-up", level: 25 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 35 } },
      { moveId: "muddy-water", method: { kind: "level-up", level: 45 } },
      { moveId: "hydro-pump", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "groudon",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 15 } },
      { moveId: "mud-shot", method: { kind: "level-up", level: 25 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 35 } },
      { moveId: "fire-blast", method: { kind: "level-up", level: 45 } },
      { moveId: "earthquake", method: { kind: "level-up", level: 60 } },
    ],
  },
  {
    pokemonId: "rayquaza",
    generation: 3,
    entries: [
      { moveId: "tackle", method: { kind: "level-up", level: 1 } },
      { moveId: "leer", method: { kind: "level-up", level: 15 } },
      { moveId: "twister", method: { kind: "level-up", level: 25 } },
      { moveId: "ancient-power", method: { kind: "level-up", level: 35 } },
      { moveId: "dragon-claw", method: { kind: "level-up", level: 45 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 55 } },
      { moveId: "dragon-dance", method: { kind: "level-up", level: 65 } },
    ],
  },
  {
    pokemonId: "jirachi",
    generation: 3,
    entries: [
      { moveId: "confusion", method: { kind: "level-up", level: 1 } },
      { moveId: "growth", method: { kind: "level-up", level: 15 } },
      { moveId: "wish", method: { kind: "level-up", level: 25 } },
      { moveId: "psychic", method: { kind: "level-up", level: 35 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 45 } },
      { moveId: "doom-desire", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "deoxys",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "psycho-boost", method: { kind: "level-up", level: 15 } },
      { moveId: "psychic", method: { kind: "level-up", level: 25 } },
      { moveId: "recover", method: { kind: "level-up", level: 35 } },
      { moveId: "cosmic-power", method: { kind: "level-up", level: 45 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 55 } },
    ],
  },
  {
    pokemonId: "deoxys-attack",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "psycho-boost", method: { kind: "level-up", level: 12 } },
      { moveId: "extrasensory", method: { kind: "level-up", level: 20 } },
      { moveId: "psychic", method: { kind: "level-up", level: 30 } },
      { moveId: "superpower", method: { kind: "level-up", level: 40 } },
      { moveId: "hyper-beam", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "deoxys-defense",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "recover", method: { kind: "level-up", level: 12 } },
      { moveId: "cosmic-power", method: { kind: "level-up", level: 20 } },
      { moveId: "iron-defense", method: { kind: "level-up", level: 30 } },
      { moveId: "psychic", method: { kind: "level-up", level: 40 } },
      { moveId: "counter", method: { kind: "level-up", level: 50 } },
    ],
  },
  {
    pokemonId: "deoxys-speed",
    generation: 3,
    entries: [
      { moveId: "leer", method: { kind: "level-up", level: 1 } },
      { moveId: "quick-attack", method: { kind: "level-up", level: 10 } },
      { moveId: "extrasensory", method: { kind: "level-up", level: 20 } },
      { moveId: "agility", method: { kind: "level-up", level: 30 } },
      { moveId: "psychic", method: { kind: "level-up", level: 40 } },
      { moveId: "recover", method: { kind: "level-up", level: 48 } },
    ],
  },
];
