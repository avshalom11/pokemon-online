import type { Zone } from "@/shared/types/zone";

// Paldea's own SIX zone encounter pools (Paldea Encounter Tables Phase 6) —
// a sibling to kanto-zone-data.ts, johto-zone-data.ts, hoenn-zone-data.ts,
// sinnoh-zone-data.ts, unova-zone-data.ts, kalos-zone-data.ts,
// alola-zone-data.ts, and galar-zone-data.ts, never a shared table with any
// of them. Unlike five-zone Kalos/Alola/Galar, Paldea is a six-zone region
// (Paldea Phase 4/5's own approved map design) — grassland/water/cave/lava/
// haunted-house/beach, Beach IS included — matching the same six polygons
// data/maps/paldea-map-config.ts already draws. The global ZoneId type
// (shared/types/zone.ts) still lists all six ids for every other region;
// this file simply creates a "beach" entry, same as Kanto/Johto/Hoenn/
// Sinnoh/Unova already do.
//
// Coverage: 120 official Generation IX base species (#906-#1025, Sprigatito
// through Pecharunt) + the 4 approved Paldean Forms (Paldean Wooper,
// Paldean Tauros's three breeds — see data/pokemon/
// generation-9-pokemon-data.ts's own header comment) = 124 total entries
// below. This exact distribution — species-per-zone, encounter order, and
// totals (30/12/19/21/25/17) — is FINAL and manually approved (Paldea
// Phase 6 spec, as amended by the Paldea Zone-Assignment Adjustment moving
// Scovillain, Orthworm, Shroodle, and Grafaiai into `lava`); nothing here
// may move a species, rebalance a zone, substitute a species, or add/remove
// a Form beyond that approved change.
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity tier
// from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-9-pokemon-data.ts) via the SAME two-stage engine Kanto/Johto/
// Hoenn/Sinnoh/Unova/Kalos/Alola/Galar already use (engine/encounter/
// pokemon-encounter-engine.ts) — nothing here invents or duplicates a
// rarity value; this file only ever supplies `encounterWeight`,
// `minimumLevel`, and `maximumLevel`.
//
// PALDEA PHASE 7 — RARITY AUDIT approved-design-change (applied after this
// phase's own manual review): 19 species' real PokemonSpecies.rarity moved
// — 14 Paradox species from "legendary" to "very-rare" (Great Tusk, Scream
// Tail, Brute Bonnet, Flutter Mane, Slither Wing, Sandy Shocks, Iron
// Treads, Iron Bundle, Iron Hands, Iron Jugulis, Iron Moth, Iron Thorns,
// Roaring Moon, Iron Valiant), Armarouge/Ceruledge/Annihilape/Archaludon
// from "rare" to "very-rare", and Charcadet from "common" to "very-rare" —
// see generation-9-pokemon-data.ts's own header comment for the full
// per-species rationale. Every one of those 19 rows below now uses the
// very-rare weight/level band (5, 6-10) instead of its pre-audit band;
// Armarouge/Ceruledge/Annihilape needed no NUMERIC change (they were
// already evolution-target "rare" at weight 5/6-10, the same band
// very-rare uses) — only Archaludon's band actually moved (10/4-8, its old
// standalone-rare band, to 5/6-10) alongside the 14 Paradox species (each
// moving from 1/55-60) and Charcadet (20/2-6 to 5/6-10). No other species'
// weight/level or zone membership was touched by this pass — same "only
// the audited rows change" precedent the Sinnoh Rarity Audit already
// established in sinnoh-zone-data.ts.
//
// The effective encounter-rarity system (engine/encounter-rarity/
// get-effective-encounter-rarity.ts) continues to apply automatically and
// without any Paldea-specific code: three species below have a real
// PokemonSpecies.rarity of "rare" but resolve to effective "very-rare" for
// Stage 1 tier selection purely because they're direct evolution-item
// targets (the same already-generalized rule every prior region's
// Stone-style items already exercise, driven entirely by
// EVOLUTION_ITEM_EVOLUTIONS in data/pokemon/pokemon-evolutions.ts, never a
// separate hardcoded list here) — Bellibolt (real rare, Thunder Stone from
// Tadbulb), Scovillain (real rare, Fire Stone from Capsakid), and Cetitan
// (real rare, Ice Stone from Cetoddle). Their own PokemonSpecies.rarity
// stays "rare" throughout (battle UI, capture odds, Pokédex all keep
// reading that unmodified value) — only Stage 1's tier draw treats them as
// very-rare, exactly like Roserade/Mismagius/Weavile/etc. already work in
// Sinnoh, Simisage/Whimsicott/etc. in Unova, Florges/Aegislash/etc. in
// Kalos, Vikavolt/Alolan Sandslash/etc. in Alola, and Galarian
// Slowking/Galarian Darmanitan/Alcremie in Galar. The Rarity Audit above
// did NOT change these three — they remain real "rare" throughout, exactly
// as approved.
//
// encounterWeight convention — the exact same convention Johto/Hoenn/
// Sinnoh/Unova/Kalos/Alola/Galar already established:
//   - legendary/mythical species (real rarity "legendary", post-audit —
//     the 4 Treasures of Ruin, the 2 box legendaries, Walking Wake/Iron
//     Leaves/Gouging Fire/Raging Bolt/Iron Boulder/Iron Crown (Paradox
//     species the audit did NOT touch), the 3 Loyal Three, Ogerpon,
//     Terapagos, Pecharunt — 18 entries): 1
//   - "very-rare" species (Paldea's three starter lines, its own
//     Frigibax/Arctibax/Baxcalibur pseudo-legendary line, the 19
//     Rarity-Audit-reclassified species above, and the three
//     evolution-item targets below whose real rarity is "rare" but whose
//     EFFECTIVE tier is "very-rare" — 12 + 19 + 3 = 34 entries draw from
//     the very-rare tier): 5, uniformly
//   - "rare" species reachable only by evolving (a level-evolution OR
//     BRANCH_EVOLUTIONS target per the canonical evolution registry,
//     data/pokemon/pokemon-evolutions.ts — e.g. Oinkologne, Spidops, Lokix,
//     Pawmot, Maushold, Dachsbun, Arboliva, Garganacl, Kilowattrel,
//     Mabosstiff, Grafaiai, Brambleghast, Toedscruel, Rabsca, Espathra,
//     Tinkaton, Wugtrio, Palafin, Revavroom, Glimmora, Houndstone,
//     Gholdengo, Sinistcha, Hydrapple, Clodsire, Farigiraf, Dudunsparce,
//     Kingambit — 27 entries post-audit (Armarouge/Ceruledge/Annihilape
//     moved out of this bucket into the very-rare one above, keeping the
//     exact same weight/level band they already had) — the same
//     "branch/level target with real rarity 'rare' gets the ordinary
//     evolution-target weight" rule Ninjask/Shedinja (Hoenn), Flapple/
//     Appletun/Sirfetch'd/etc. (Galar), and every prior region's own
//     equivalents already established): 5
//   - "rare" species with no such predecessor (a standalone rare mon —
//     Squawkabilly, Klawf, Bombirdier, Cyclizar, Orthworm, Flamigo, Veluza,
//     Dondozo, Tatsugiri, and the three Paldean Tauros breeds — 12 entries
//     post-audit; Archaludon moved out of this bucket into the very-rare
//     one above): 10
//   - "common" species: 32, uniformly (never demoted for being an evolution
//     target — e.g. Pawmo, Dolliv, Naclstack, Tinkatuff, Dipplin all stay
//     at the standard common weight despite being real evolution targets,
//     matching the same rule every prior region already follows; Charcadet
//     moved out of this bucket into the very-rare one above).
// Evolution-target status (for the level/branch-evolution "rare" bucket
// above) is read directly from getAllLevelEvolutionEntries/getBranchEvolution
// in data/pokemon/pokemon-evolutions.ts — never a separate hardcoded Paldea
// evolution-target list.
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility via
// deriveSpeciesWildLevelRange; see pokemon-encounter-engine.ts's own doc
// comment) and never reads these two fields. Values are placeholders in the
// same weight-correlated band Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos/Alola/
// Galar's own data already uses (weight 20 -> 2-6, weight 10 -> 4-8, weight
// 5 -> 6-10, weight 1/legendary -> 55-60) purely so they read as sensible
// data, not because anything consumes them as the actual generated range.
export const PALDEA_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של פלדיאה",
    description: "מישורים ירוקים ופתוחים שבהם משוטטים פוקימוני פלדיאה הנפוצים.",
    imageUrl: "/zones/grassland.png",

    encounters: [
      { pokemonId: "sprigatito", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "floragato", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "meowscarada", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lechonk", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "oinkologne", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tarountula", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "spidops", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "nymble", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lokix", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pawmi", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "pawmo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "pawmot", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tandemaus", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "maushold", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "smoliv", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dolliv", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "arboliva", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "squawkabilly", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "capsakid", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "rellor", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "farigiraf", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dudunsparce", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tauros-paldea-combat", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "ogerpon", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "iron-leaves", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "dipplin", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "hydrapple", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "terapagos", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "sandy-shocks", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "raging-bolt", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של פלדיאה",
    description: "נחלים ומפרצים בהירים שבהם שוחים פוקימוני המים של פלדיאה.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "quaxly", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "quaxwell", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "quaquaval", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wiglett", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "wugtrio", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "finizen", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "palafin", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "veluza", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "dondozo", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "walking-wake", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "tauros-paldea-aqua", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "tatsugiri", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
    ],
  },
  {
    id: "cave",
    name: "אזור המערות של פלדיאה",
    description: "מערות סלעיות ומחצבים נטושים שבהם מסתתרים פוקימוני האדמה והברזל של פלדיאה.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "nacli", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "naclstack", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "garganacl", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "maschiff", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mabosstiff", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "glimmet", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "glimmora", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "great-tusk", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "iron-treads", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "iron-hands", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "iron-thorns", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "iron-valiant", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "ting-lu", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "iron-boulder", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "iron-crown", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "kingambit", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "archaludon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tadbulb", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bellibolt", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של פלדיאה",
    description: "שדות געשיים לוהטים שבהם חיים פוקימוני האש של פלדיאה.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "fuecoco", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "crocalor", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "skeledirge", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "charcadet", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "armarouge", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "varoom", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "revavroom", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "slither-wing", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "chi-yu", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "koraidon", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "gouging-fire", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "iron-moth", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tauros-paldea-blaze", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "frigibax", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "arctibax", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "baxcalibur", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "roaring-moon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "scovillain", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "orthworm", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "shroodle", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "grafaiai", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "haunted-house",
    name: "הבית הרדוף של פלדיאה",
    description: "מבנה נטוש ומסתורי שבו משוטטים פוקימוני הרפאים של פלדיאה.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "ceruledge", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "greavard", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "houndstone", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "scream-tail", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "brute-bonnet", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "flutter-mane", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wo-chien", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "munkidori", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "pecharunt", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "annihilape", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "iron-jugulis", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "poltchageist", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sinistcha", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "fidough", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dachsbun", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bramblin", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "brambleghast", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rabsca", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "flittle", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "espathra", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tinkatink", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "tinkatuff", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "tinkaton", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "gimmighoul", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gholdengo", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "beach",
    name: "אזור החוף של פלדיאה",
    description: "חופים שלווים ומפרצים שבהם נחים פוקימוני פלדיאה.",
    imageUrl: "/zones/beach.png",

    encounters: [
      { pokemonId: "wattrel", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "kilowattrel", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bombirdier", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "cetoddle", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "cetitan", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "miraidon", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "okidogi", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "toedscool", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "toedscruel", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cyclizar", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "flamigo", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "iron-bundle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wooper-paldea", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "clodsire", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "klawf", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "chien-pao", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "fezandipiti", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
];
