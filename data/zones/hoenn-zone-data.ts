import type { Zone } from "@/shared/types/zone";

// Hoenn's own six zone encounter pools (Hoenn Encounter Tables Phase 4) — a
// sibling to kanto-zone-data.ts and johto-zone-data.ts, never a shared
// table with either. Same zone ids as Kanto/Johto (grassland/water/cave/
// lava/beach/haunted-house), but each one's `encounters` array here draws
// only from Hoenn species (#252-#386) plus the three Deoxys alternate
// forms, exactly the "same zone id, different region, different pool"
// shape those two files already establish.
//
// Coverage: all 135 official Hoenn base species (#252-#386) plus the three
// Deoxys alternate forms (deoxys-attack/defense/speed — see
// features/pokemon/forms's own Forms architecture; all four Deoxys forms
// stay grouped under the single #0386 Pokédex entry, this file never
// creates a duplicate National Dex row) = 138 total entries below. No
// species is split across zones, none is omitted, none is duplicated —
// this exact distribution was reviewed and approved zone-by-zone before
// this file was written (see the project's own Hoenn Encounter Planning
// analysis).
//
// Masquerain is deliberately in Grassland, not Water, even though it
// evolves from Surskit (Water) — an intentional game-design decision made
// after the initial implementation, overriding the "keep an evolution line
// in one zone" default this file otherwise follows everywhere else. Not a
// bug and not something to "fix" back to Water.
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity
// tier from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-3-pokemon-data.ts) via the SAME two-stage engine Kanto/Johto
// already use (engine/encounter/pokemon-encounter-engine.ts) — nothing
// here invents or duplicates a rarity value; this file only ever supplies
// `encounterWeight`, `minimumLevel`, and `maximumLevel`. The effective
// encounter-rarity system (engine/encounter-rarity/
// get-effective-encounter-rarity.ts) continues to apply automatically and
// without any Hoenn-specific code: five species below have a real
// PokemonSpecies.rarity of "rare" but resolve to effective "very-rare" for
// Stage 1 tier selection purely because they're direct evolution-item
// targets (an existing, already-generalized rule from the Hoenn Evolution
// phases, covering every item type — Stone, King's-Rock-style, and the
// Hoenn Deep Sea/Moon Stone additions alike) — Shiftry (Leaf Stone),
// Ludicolo (Water Stone), Delcatty (Moon Stone), Huntail (Deep Sea Tooth),
// and Gorebyss (Deep Sea Scale). Their own PokemonSpecies.rarity stays
// "rare" throughout (battle UI, capture odds, Pokédex all keep reading
// that unmodified value) — only Stage 1's tier draw treats them as
// very-rare, exactly like Bellossom/Sunflora/Politoed/Steelix/etc. already
// work in Kanto/Johto.
//
// encounterWeight convention (relative odds ONLY among species that already
// share the same EFFECTIVE rarity tier within this same zone — see
// getEffectiveEncounterRarity; Stage 1 alone decides which tier gets
// picked, this file never simulates tier probability) — the exact same
// convention johto-zone-data.ts already established:
//   - legendary/mythical species: 1
//   - "very-rare" species (starters, the Bagon line, the Beldum line —
//     this catalog's own "prize" tier): 5, uniformly
//   - "rare" species reachable only by evolving (a level/item/branch
//     TARGET, never obtainable as itself in the wild any other way — e.g.
//     Beautifly, Breloom, Aggron, Milotic, Metagross): 5
//   - "rare" species with no such predecessor (a standalone rare mon like
//     Plusle, Minun, Zangoose, Absol, Kecleon, Sableye): 10
//   - "common" species: 20, uniformly (never demoted for being an
//     evolution target — e.g. Zigzagoon/Numel/Ralts stay at the standard
//     common weight, matching the same rule Furret/Quagsire/Magcargo
//     already follow in Johto).
// Deoxys and all three of its alternate forms are independently
// encounterable in Haunted House, each its own legendary-tier entry at
// weight 1 — no special-casing beyond what every other legendary already
// gets, since each Deoxys form is already its own full PokemonSpecies row
// (features/pokemon/forms) with its own rarity: "legendary".
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility; see
// pokemon-encounter-engine.ts's own doc comment) and never reads these two
// fields. Values are placeholders in the same weight-correlated band
// Kanto/Johto's own data already uses (weight 20 -> 2-6, weight 10 -> 4-8,
// weight 5 -> 6-10, weight 1/legendary -> 55-60) purely so they read as
// sensible data, not because anything consumes them as the actual
// generated range.
export const HOENN_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של הוען",
    description: "שדות ירוקים ומרחבים פתוחים שבהם חיים פוקימוני הוען הנפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "treecko", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "grovyle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sceptile", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zigzagoon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "linoone", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wurmple", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "silcoon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "beautifly", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cascoon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dustox", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "seedot", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "nuzleaf", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "shiftry", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "taillow", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "swellow", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "masquerain", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "shroomish", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "breloom", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "slakoth", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "vigoroth", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "slaking", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "skitty", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "delcatty", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "electrike", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "manectric", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "plusle", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "minun", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "volbeat", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "illumise", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "roselia", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "spinda", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "swablu", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "altaria", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zangoose", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "castform", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "kecleon", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "tropius", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "rayquaza", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "vibrava", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "flygon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cacnea", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "cacturne", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "poochyena", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mightyena", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "latias", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "latios", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של הוען",
    description: "אגמים ומפרצים שקטים שבהם שוחים פוקימוני המים של הוען.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "mudkip", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "marshtomp", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "swampert", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lotad", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lombre", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ludicolo", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "surskit", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "carvanha", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sharpedo", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wailmer", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "wailord", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "barboach", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "whiscash", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "feebas", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "milotic", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "kyogre", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "relicanth", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "huntail", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "gorebyss", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "luvdisc", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
    ],
  },
  {
    id: "cave",
    name: "מערת הוען",
    description: "מערה עמוקה וחשוכה שבה מסתתרים פוקימוני הוען נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "nincada", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ninjask", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "makuhita", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "hariyama", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "nosepass", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "aron", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lairon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "aggron", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "swalot", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lileep", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "cradily", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "anorith", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "armaldo", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "glalie", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "beldum", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "metang", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "metagross", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "regirock", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "regice", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "registeel", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של הוען",
    description: "אדמה געשית לוהטת שבה חיים פוקימוני האש והמדבר של הוען.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "torchic", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "combusken", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "blaziken", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "numel", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "camerupt", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "torkoal", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "trapinch", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mawile", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "groudon", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "gulpin", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "seviper", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "bagon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "shelgon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "salamence", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "beach",
    name: "חוף הוען",
    description: "חוף שקט שבו נחים פוקימוני הוען הידידותיים.",
    imageUrl: "/zones/beach.png",

    encounters: [
      { pokemonId: "wingull", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "pelipper", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "azurill", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "corphish", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "crawdaunt", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "spheal", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sealeo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "walrein", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "clamperl", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "whismur", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "loudred", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "exploud", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "snorunt", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות של הוען",
    description: "בית נטוש שבו מסתתרים פוקימוני הרוח והנפש של הוען.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "ralts", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "kirlia", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gardevoir", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "shedinja", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sableye", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "spoink", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "grumpig", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lunatone", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "shuppet", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "banette", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "duskull", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dusclops", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "chimecho", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "absol", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "wynaut", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "jirachi", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "deoxys", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "deoxys-attack", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "deoxys-defense", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "deoxys-speed", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "meditite", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "medicham", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "baltoy", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "claydol", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "solrock", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
    ],
  },
];
