import type { Zone } from "@/shared/types/zone";

// Galar's own FIVE zone encounter pools (Galar Encounter Tables Phase 6) —
// a sibling to kanto-zone-data.ts, johto-zone-data.ts, hoenn-zone-data.ts,
// sinnoh-zone-data.ts, unova-zone-data.ts, kalos-zone-data.ts, and
// alola-zone-data.ts, never a shared table with any of them. Galar is a
// deliberate five-zone region (Galar Phase 4/5's own approved map design)
// — grassland/water/cave/lava/haunted-house only, NO beach — matching the
// same five polygons data/maps/galar-map-config.ts already draws. The
// global ZoneId type (shared/types/zone.ts) still lists all six ids for
// every other region; this file simply never creates a "beach" entry for
// Galar.
//
// Coverage: 89 official Generation VIII base species (#810-#898, Grookey
// through Calyrex) + the 19 approved Galarian Forms (regional variants of
// 19 Kanto/Johto/Hoenn/Unova species — see data/pokemon/
// generation-8-pokemon-data.ts's own header comment) = 108 total entries
// below. This exact distribution — species-per-zone, encounter order, and
// totals (35/18/17/16/22) — is FINAL and manually approved (Galar Phase 6
// spec); nothing here may move a species, rebalance a zone, substitute a
// species, or add/remove a Form.
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity tier
// from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-8-pokemon-data.ts) via the SAME two-stage engine Kanto/Johto/
// Hoenn/Sinnoh/Unova/Kalos/Alola already use (engine/encounter/
// pokemon-encounter-engine.ts) — nothing here invents or duplicates a
// rarity value; this file only ever supplies `encounterWeight`,
// `minimumLevel`, and `maximumLevel`. This phase does NOT perform a manual
// Galar Rarity Audit (that is Galar Phase 7's own explicit scope) — every
// PokemonSpecies.rarity below is exactly what Galar Phase 1 originally
// assigned, unmodified.
//
// The effective encounter-rarity system (engine/encounter-rarity/
// get-effective-encounter-rarity.ts) continues to apply automatically and
// without any Galar-specific code: three species below have a real
// PokemonSpecies.rarity of "rare" but resolve to effective "very-rare" for
// Stage 1 tier selection purely because they're direct evolution-item
// targets (the same already-generalized rule every prior region's
// Stone-style items already exercise, driven entirely by
// EVOLUTION_ITEM_EVOLUTIONS in data/pokemon/pokemon-evolutions.ts, never a
// separate hardcoded list here) — Galarian Slowking (real rare, King's Rock
// from Galarian Slowpoke, mirroring ordinary Slowpoke's own King's Rock
// branch), Galarian Darmanitan (real rare, Ice Stone from Galarian
// Darumaka), and Alcremie (real rare, Shiny Stone from Milcery, the same
// Fairy-dessert-species precedent Spritzee/Swirlix already established).
// Their own PokemonSpecies.rarity stays "rare" throughout (battle UI,
// capture odds, Pokédex all keep reading that unmodified value) — only
// Stage 1's tier draw treats them as very-rare, exactly like
// Roserade/Mismagius/Weavile/etc. already work in Sinnoh, Simisage/
// Whimsicott/etc. already work in Unova, Florges/Aegislash/etc. already
// work in Kalos, and Vikavolt/Alolan Sandslash/Alolan Ninetales/Alolan
// Exeggutor already work in Alola.
//
// encounterWeight convention — the exact same convention Johto/Hoenn/
// Sinnoh/Unova/Kalos/Alola already established:
//   - legendary/mythical species (real rarity "legendary" — Zacian,
//     Zamazenta, Eternatus, Kubfu, Urshifu, Zarude, Regieleki, Regidrago,
//     Glastrier, Spectrier, Calyrex, and the three Galarian Legendary birds
//     — Articuno/Zapdos/Moltres-Galar): 1
//   - "very-rare" species (Galar's three starter lines and its own
//     Dreepy/Drakloak/Dragapult pseudo-legendary line — 12 real-very-rare
//     entries — plus the three evolution-item targets above, whose real
//     rarity is "rare" but whose EFFECTIVE tier is "very-rare"): 5,
//     uniformly
//   - "rare" species reachable only by evolving (a level-evolution OR
//     BRANCH_EVOLUTIONS target per the canonical evolution registry,
//     data/pokemon/pokemon-evolutions.ts — e.g. Greedent, Corviknight,
//     Orbeetle, Thievul, Eldegoss, Dubwool, Boltund, Flapple, Appletun,
//     Sirfetch'd, Linoone-Galar, Obstagoon, Coalossal, Sandaconda,
//     Perrserker, Darmanitan-Galar (also an item target, already covered
//     above), Copperajah, Runerigus, Toxtricity, Centiskorch, Rapidash-
//     Galar, Polteageist, Hatterene, Grimmsnarl, Cursola, Mr. Rime,
//     Drednaw, Barraskewda, Grapploct, Frosmoth — the same "branch/level
//     target with real rarity 'rare' gets the ordinary evolution-target
//     weight" rule Ninjask/Shedinja (Hoenn) and every prior region's own
//     equivalents already established): 5
//   - "rare" species with no such predecessor (a standalone rare mon —
//     Falinks, Morpeko, Farfetch'd-Galar, Arctozolt, Dracovish, Arctovish,
//     Eiscue, Cramorant, Pincurchin, Stonjourner, Duraludon, Stunfisk-
//     Galar, Dracozolt, Indeedee, Mr. Mime-Galar): 10
//   - "common" species: 20, uniformly (never demoted for being an evolution
//     target — e.g. Skwovet/Rookidee/Corvisquire/Blipbug/Dottler/Nickit/
//     Gossifleur/Wooloo/Yamper/Applin/Zigzagoon-Galar/Snom/Slowpoke-Galar/
//     Slowbro-Galar/Chewtle/Arrokuda/Clobbopus/Rolycoly/Carkol/Silicobra/
//     Meowth-Galar/Darumaka-Galar/Cufant/Yamask-Galar/Toxel/Sizzlipede/
//     Ponyta-Galar/Weezing-Galar/Sinistea/Hatenna/Hattrem/Impidimp/Morgrem/
//     Corsola-Galar/Milcery all stay at the standard common weight, matching
//     the same rule every prior region already follows).
// Evolution-target status (for the level/branch-evolution "rare" bucket
// above) is read directly from getAllLevelEvolutionEntries/getBranchEvolution
// in data/pokemon/pokemon-evolutions.ts — never a separate hardcoded Galar
// evolution-target list.
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility via
// deriveSpeciesWildLevelRange; see pokemon-encounter-engine.ts's own doc
// comment) and never reads these two fields. Values are placeholders in the
// same weight-correlated band Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos/Alola's
// own data already uses (weight 20 -> 2-6, weight 10 -> 4-8, weight 5 ->
// 6-10, weight 1/legendary -> 55-60) purely so they read as sensible data,
// not because anything consumes them as the actual generated range.
export const GALAR_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של גלאר",
    description: "שדות ומרחבים פתוחים שבהם חיים פוקימוני גלאר הנפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "grookey", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "thwackey", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rillaboom", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "skwovet", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "greedent", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rookidee", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "corvisquire", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "corviknight", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "blipbug", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dottler", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "orbeetle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "nickit", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "thievul", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "gossifleur", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "eldegoss", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wooloo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dubwool", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "yamper", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "boltund", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "applin", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "flapple", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "appletun", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "falinks", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "morpeko", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "sirfetchd", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zarude", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "farfetchd-galar", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "zapdos-galar", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "zigzagoon-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "linoone-galar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "arctozolt", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "regieleki", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "obstagoon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "snom", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "frosmoth", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של גלאר",
    description: "מפרצים ואגמים שקטים שבהם שוחים פוקימוני המים של גלאר.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "sobble", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "drizzile", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "inteleon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dracovish", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "arctovish", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "slowpoke-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "slowbro-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "slowking-galar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "eiscue", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "articuno-galar", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "chewtle", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "drednaw", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cramorant", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "arrokuda", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "barraskewda", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "clobbopus", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "grapploct", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pincurchin", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
    ],
  },
  {
    id: "cave",
    name: "מערת גלאר",
    description: "מערה עמוקה וחשוכה שבה מסתתרים פוקימוני גלאר נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "rolycoly", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "carkol", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "coalossal", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "silicobra", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sandaconda", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "perrserker", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "stonjourner", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "duraludon", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "glastrier", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "meowth-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "darumaka-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "darmanitan-galar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "stunfisk-galar", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "cufant", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "copperajah", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "runerigus", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "yamask-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של גלאר",
    description: "אדמה געשית לוהטת שבה חיים פוקימוני האש וההרים של גלאר.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "scorbunny", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "raboot", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cinderace", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "toxel", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "toxtricity", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sizzlipede", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "centiskorch", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zacian", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "zamazenta", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "kubfu", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "urshifu", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "moltres-galar", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "ponyta-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "rapidash-galar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dracozolt", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "weezing-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות של גלאר",
    description: "בית נטוש שבו מסתתרים פוקימוני הרוח והנפש של גלאר.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "sinistea", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "polteageist", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "hatenna", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "hattrem", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "hatterene", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "impidimp", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "morgrem", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "grimmsnarl", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cursola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mr-rime", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dreepy", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "drakloak", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dragapult", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "eternatus", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "spectrier", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "calyrex", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "corsola-galar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "milcery", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "alcremie", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "indeedee", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "regidrago", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "mr-mime-galar", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
    ],
  },
];
