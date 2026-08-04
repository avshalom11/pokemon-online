import type { Zone } from "@/shared/types/zone";

// Johto's own six zone encounter pools (Phase 4) — a sibling to
// kanto-zone-data.ts, never a shared table with it. Same zone ids as Kanto
// (grassland/water/cave/lava/beach/haunted-house), but each one's
// `encounters` array here draws only from Johto species (#152-#251),
// exactly the "same zone id, different region, different pool" shape this
// phase's own spec calls for.
//
// Coverage: every one of the 100 Johto species (#152-#251) appears in
// exactly one of these six zones, per the already-approved zone
// distribution — see the Phase 4 planning conversation this file
// implements. No species is split across zones, none is omitted, none is
// duplicated.
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity tier
// from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-2-pokemon-data.ts) via the SAME two-stage engine Kanto already
// uses (engine/encounter/pokemon-encounter-engine.ts) — nothing here
// invents or duplicates a rarity value; this file only ever supplies
// `encounterWeight`, `minimumLevel`, and `maximumLevel`.
//
// encounterWeight convention (relative odds ONLY among species that already
// share the same EFFECTIVE rarity tier within this same zone — see
// getEffectiveEncounterRarity; Stage 1 alone decides which tier gets
// picked, this file never simulates tier probability):
//   - legendary/mythical species: 1
//   - "very-rare" species (starters, Espeon/Umbreon, the Larvitar line —
//     this catalog's own "prize" tier): 5, uniformly
//   - "rare" species reachable only by evolving (a level/stone/trade/
//     friendship/stat-branch TARGET, never obtainable as itself in the
//     wild any other way — e.g. Noctowl, Crobat, Ampharos, Politoed,
//     Steelix, Blissey): 5
//   - "rare" species with no such predecessor (a standalone rare mon like
//     Sudowoodo, Unown, Girafarig, Miltank, Skarmory): 10
//   - "common" species: 20, uniformly (never demoted for being an
//     evolution target — e.g. Furret/Quagsire/Magcargo stay at the
//     standard common weight; demoting them would quietly re-encode a
//     rarity distinction this catalog's own PokemonSpecies.rarity already
//     says isn't there, which is exactly what this phase's own "do not use
//     encounterWeight to simulate rarity-tier probability" rule forbids).
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility; see
// pokemon-encounter-engine.ts's own doc comment) and never reads these two
// fields. Values are placeholders in the same weight-correlated band Kanto's
// own data already uses (weight 20 -> 2-6, weight 10 -> 4-8, weight 5 ->
// 6-10, weight 1/legendary -> 55-60) purely so they read as sensible data,
// not because anything consumes them as the actual generated range.
export const JOHTO_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של ג'והטו",
    description: "שדות ירוקים ויערות עבותים שבהם חיים פוקימוני ג'והטו הנפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "chikorita", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bayleef", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "meganium", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sentret", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "furret", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "hoothoot", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "noctowl", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "ledyba", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ledian", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "spinarak", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ariados", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "pichu", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "igglybuff", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "togepi", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "togetic", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mareep", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "flaaffy", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ampharos", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bellossom", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "hoppip", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "skiploom", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "jumpluff", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "aipom", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sunkern", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sunflora", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "girafarig", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "pineco", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "forretress", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "scizor", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "heracross", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "skarmory", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "stantler", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "elekid", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "miltank", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "blissey", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "raikou", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "celebi", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של ג'והטו",
    description: "אגמים ונחלים שקטים שבהם שוחים פוקימוני מים של ג'והטו.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "totodile", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "croconaw", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "feraligatr", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "chinchou", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lanturn", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "politoed", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wooper", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "qwilfish", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "remoraid", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mantine", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "kingdra", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lugia", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "cave",
    name: "מערת ג'והטו",
    description: "מערה עמוקה וחשוכה שבה מסתתרים פוקימוני ג'והטו נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "crobat", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cleffa", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sudowoodo", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "unown", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "gligar", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "steelix", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sneasel", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "teddiursa", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ursaring", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "swinub", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "piloswine", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "delibird", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "phanpy", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "donphan", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tyrogue", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "hitmontop", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "larvitar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pupitar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tyranitar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של ג'והטו",
    description: "אדמה געשית לוהטת שבה חיים פוקימוני האש של ג'והטו.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "cyndaquil", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "quilava", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "typhlosion", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "slugma", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "magcargo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "houndour", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "houndoom", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "magby", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "entei", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "ho-oh", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "beach",
    name: "חוף ג'והטו",
    description: "חוף שקט שבו נחים פוקימוני ג'והטו הידידותיים.",
    imageUrl: "/zones/beach.png",

    encounters: [
      { pokemonId: "marill", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "azumarill", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "yanma", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "quagsire", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "slowking", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dunsparce", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "shuckle", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "corsola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "octillery", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "smeargle", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "suicune", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות של ג'והטו",
    description: "בית נטוש שבו מסתתרים פוקימוני הרוח והנפש של ג'והטו.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "natu", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "xatu", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "espeon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "umbreon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "murkrow", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "misdreavus", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "wobbuffet", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "snubbull", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "granbull", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "porygon2", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "smoochum", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
    ],
  },
];
