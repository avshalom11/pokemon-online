import type { Zone } from "@/shared/types/zone";

// Unova's own six zone encounter pools (Unova Encounter Tables phase,
// extended by the Unova Update phase) — a sibling to kanto-zone-data.ts,
// johto-zone-data.ts, hoenn-zone-data.ts, and sinnoh-zone-data.ts, never a
// shared table with any of them. Same zone ids as every other region
// (grassland/water/cave/lava/beach/haunted-house), but each one's
// `encounters` array here draws only from Unova species (#494-#649) plus
// the seven approved alternate forms, exactly the "same zone id, different
// region, different pool" shape those four files already establish.
//
// Coverage: all 156 official Unova base species (#494-#649) plus seven
// approved alternate forms (tornadus-therian, thundurus-therian,
// landorus-therian, kyurem-black, kyurem-white, keldeo-resolute,
// meloetta-pirouette — see features/pokemon/forms's own Forms architecture;
// every form stays grouped under its base's single National Dex row, this
// file never creates a duplicate entry) = 163 total entries below. This
// exact distribution — species-per-zone, encounter order, and totals
// (51/17/27/21/21/26) — is FINAL and manually approved; nothing here may
// move a species, rebalance a zone, substitute a species, or add/remove a
// Form beyond the one approved Unova Update addition (Keldeo Resolute,
// added to Water).
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity tier
// from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-5-pokemon-data.ts) via the SAME two-stage engine Kanto/Johto/
// Hoenn/Sinnoh already use (engine/encounter/pokemon-encounter-engine.ts) —
// nothing here invents or duplicates a rarity value; this file only ever
// supplies `encounterWeight`, `minimumLevel`, and `maximumLevel`. The
// effective encounter-rarity system (engine/encounter-rarity/
// get-effective-encounter-rarity.ts) continues to apply automatically and
// without any Unova-specific code: nine species below have a real
// PokemonSpecies.rarity of "rare" but resolve to effective "very-rare" for
// Stage 1 tier selection purely because they're direct evolution-item
// targets (the same already-generalized rule every prior region's
// Stone-style items already exercise, driven entirely by
// EVOLUTION_ITEM_EVOLUTIONS in data/pokemon/pokemon-evolutions.ts, never a
// separate hardcoded list here) — Simisage/Simisear/Simipour (their
// elemental Stone trio), Musharna (Moon Stone), Whimsicott (Sun Stone),
// Lilligant (Sun Stone), Cinccino (Shiny Stone), Eelektross (Thunder Stone),
// and Chandelure (Dusk Stone). Their own PokemonSpecies.rarity stays "rare"
// throughout (battle UI, capture odds, Pokédex all keep reading that
// unmodified value) — only Stage 1's tier draw treats them as very-rare,
// exactly like Roserade/Mismagius/Weavile/etc. already work in Sinnoh.
//
// Unova Update rarity pass: Zorua, Zoroark, Larvesta, and Volcarona are now
// real "very-rare" in the canonical catalog (data/pokemon/
// generation-5-pokemon-data.ts) — a direct rarity reassignment, not an
// encounter-only override (none of the four are evolution-item targets).
// Their zones are unchanged (Zorua/Zoroark stay Haunted House, Larvesta/
// Volcarona stay Lava); only their `encounterWeight`/level band below was
// updated to match the real-very-rare convention.
//
// encounterWeight convention — the exact same convention Johto/Hoenn/Sinnoh
// already established:
//   - legendary/mythical species (Victini, Cobalion/Terrakion/Virizion,
//     Tornadus/Thundurus/Landorus incl. Therian forms, Reshiram, Zekrom,
//     Kyurem incl. Black/White, Keldeo incl. Resolute Form, Meloetta incl.
//     Pirouette, Genesect): 1
//   - "very-rare" species (the three Unova starter lines, the
//     Deino/Zweilous/Hydreigon pseudo-legendary line, and — since the Unova
//     Update rarity pass — Zorua/Zoroark/Larvesta/Volcarona, this catalog's
//     own "prize" tier — plus the nine evolution-item targets above, whose
//     real rarity is "rare" but whose EFFECTIVE tier is "very-rare"): 5,
//     uniformly
//   - "rare" species reachable only by evolving (a level-evolution TARGET
//     per the canonical evolution registry, data/pokemon/
//     pokemon-evolutions.ts — e.g. Watchog, Stoutland, Gigalith,
//     Conkeldurr, Escavalier, Accelgor): 5
//   - "rare" species with no such predecessor (a standalone rare mon —
//     Audino, Throh, Sawk, Basculin, Maractus, Sigilyph, Emolga, Alomomola,
//     Cryogonal, Stunfisk, Druddigon, Bouffalant, Heatmor, Durant): 10
//   - "common" species: 20, uniformly (never demoted for being an evolution
//     target — e.g. Herdier/Tranquill/Boldore/Gurdurr/Swadloon/Gothorita
//     stay at the standard common weight, matching the same rule every
//     prior region already follows).
// Evolution-target status (for the level-evolution "rare" bucket above) is
// read directly from getLevelEvolution/getBranchEvolution/
// getAllEvolutionItemEvolutionEntries in data/pokemon/pokemon-evolutions.ts
// — never a separate hardcoded Unova evolution-target list. The former
// Trade-evolution replacements (Timburr->Gurdurr->Conkeldurr,
// Roggenrola->Boldore->Gigalith, Karrablast->Escavalier,
// Shelmet->Accelgor) already carry their approved level thresholds
// (Gurdurr/Boldore at 25, Conkeldurr/Gigalith at 40, Escavalier/Accelgor at
// 35) in that same registry — untouched by this file.
//
// All seven approved alternate forms are independently encounterable, each
// its own full-tier legendary entry at weight 1 — no special-casing beyond
// what every other legendary already gets, since each form is already its
// own full PokemonSpecies row (features/pokemon/forms) with its own
// rarity: "legendary". Tornadus/Tornadus-Therian and
// Landorus/Landorus-Therian share Grassland/Cave respectively (their base
// zone), Thundurus/Thundurus-Therian share Beach, Kyurem/Kyurem-Black share
// Beach while Kyurem-White sits in Lava, Keldeo/Keldeo-Resolute share Water
// (Unova Update), and Meloetta/Meloetta-Pirouette share Haunted House —
// matching this phase's approved distribution exactly; formOf/formLabel/
// spriteId/base stats/learnsets/Pokédex grouping are untouched by this
// file.
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility via
// deriveSpeciesWildLevelRange; see pokemon-encounter-engine.ts's own doc
// comment) and never reads these two fields. Values are placeholders in the
// same weight-correlated band Kanto/Johto/Hoenn/Sinnoh's own data already
// uses (weight 20 -> 2-6, weight 10 -> 4-8, weight 5 -> 6-10, weight 1/
// legendary -> 55-60) purely so they read as sensible data, not because
// anything consumes them as the actual generated range. No branch- or
// item-evolution level behavior is touched by this file.
export const UNOVA_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של אונובה",
    description: "שדות ירוקים ומרחבים פתוחים שבהם חיים פוקימוני אונובה הנפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "snivy", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "servine", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "serperior", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "patrat", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "watchog", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lillipup", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "herdier", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "stoutland", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pansage", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "simisage", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pidove", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "tranquill", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "unfezant", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "blitzle", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "zebstrika", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "audino", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "throh", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "sawk", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "sewaddle", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "swadloon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "leavanny", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "venipede", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "whirlipede", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "scolipede", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cottonee", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "whimsicott", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "petilil", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lilligant", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "maractus", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "trubbish", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "garbodor", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "minccino", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "cinccino", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "deerling", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sawsbuck", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "emolga", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "karrablast", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "escavalier", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "foongus", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "amoonguss", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "joltik", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "galvantula", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mienfoo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mienshao", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bouffalant", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "virizion", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "tornadus", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "tornadus-therian", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "ferroseed", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ferrothorn", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "genesect", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של אונובה",
    description: "אגמים ומפרצים שקטים שבהם שוחים פוקימוני המים של אונובה.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "oshawott", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dewott", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "samurott", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "panpour", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "simipour", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tympole", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "palpitoad", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "seismitoad", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "basculin", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "frillish", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "jellicent", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "alomomola", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "tynamo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "eelektrik", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "eelektross", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "keldeo", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "keldeo-resolute", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "cave",
    name: "מערת אונובה",
    description: "מערה עמוקה וחשוכה שבה מסתתרים פוקימוני אונובה נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "roggenrola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "boldore", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gigalith", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "woobat", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "swoobat", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "drilbur", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "excadrill", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "timburr", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gurdurr", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "conkeldurr", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "archen", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "archeops", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "klink", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "klang", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "klinklang", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cubchoo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "beartic", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cryogonal", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "rufflet", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "braviary", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "durant", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "cobalion", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "terrakion", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "landorus", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "landorus-therian", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "golett", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "golurk", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של אונובה",
    description: "אדמה געשית לוהטת שבה חיים פוקימוני האש וההרים של אונובה.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "tepig", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pignite", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "emboar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pansear", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "simisear", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "darumaka", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "darmanitan", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "heatmor", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "larvesta", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "volcarona", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "reshiram", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "victini", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "axew", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "fraxure", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "haxorus", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "druddigon", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "deino", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zweilous", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "hydreigon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zekrom", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "kyurem-white", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "beach",
    name: "חוף אונובה",
    description: "חוף שקט שבו נחים פוקימוני אונובה הידידותיים.",
    imageUrl: "/zones/beach.png",

    encounters: [
      { pokemonId: "sandile", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "krokorok", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "krookodile", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tirtouga", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "carracosta", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "ducklett", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "swanna", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "stunfisk", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "shelmet", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "accelgor", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dwebble", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "crustle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "scraggy", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "scrafty", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "vanillite", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "vanillish", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "vanilluxe", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "thundurus", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "thundurus-therian", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "kyurem", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "kyurem-black", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות של אונובה",
    description: "בית נטוש שבו מסתתרים פוקימוני הרוח והנפש של אונובה.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "purrloin", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "liepard", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "munna", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "musharna", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sigilyph", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "yamask", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "cofagrigus", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zorua", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zoroark", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "gothita", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gothorita", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gothitelle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "solosis", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "duosion", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "reuniclus", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "elgyem", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "beheeyem", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "litwick", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lampent", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "chandelure", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pawniard", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bisharp", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "vullaby", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mandibuzz", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "meloetta", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "meloetta-pirouette", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
];
