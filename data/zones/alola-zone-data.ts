import type { Zone } from "@/shared/types/zone";

// Alola's own FIVE zone encounter pools (Alola Encounter Tables Phase 6) —
// a sibling to kanto-zone-data.ts, johto-zone-data.ts, hoenn-zone-data.ts,
// sinnoh-zone-data.ts, unova-zone-data.ts, and kalos-zone-data.ts, never a
// shared table with any of them. Alola is a deliberate five-zone region
// (Alola Phase 4/5's own approved map design) — grassland/water/cave/lava/
// haunted-house only, NO beach — matching the same five polygons
// data/maps/alola-map-config.ts already draws. The global ZoneId type
// (shared/types/zone.ts) still lists all six ids for every other region;
// this file simply never creates a "beach" entry for Alola.
//
// Coverage: 88 official Generation VII base species (#722-#809, Rowlet
// through Melmetal) + the 18 approved Alolan Forms (regional variants of 18
// Kanto species — see data/pokemon/generation-7-pokemon-data.ts's own
// header comment) + the 2 additional Lycanroc Forms (lycanroc-midnight,
// lycanroc-dusk; base lycanroc is itself one of the 88 base species and
// represents Midday Form) = 108 total entries below. This exact
// distribution — species-per-zone, encounter order, and totals
// (44/19/18/14/13) — is FINAL and manually approved; nothing here may move
// a species, rebalance a zone, substitute a species, or add/remove a Form.
// Rockruff and all three Lycanroc Forms are deliberately all in Lava, and
// Alolan Marowak is deliberately in Haunted House (not Grassland, where
// ordinary Marowak lives in kanto-zone-data.ts), per this phase's own
// explicit approved distribution.
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity tier
// from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-7-pokemon-data.ts) via the SAME two-stage engine Kanto/Johto/
// Hoenn/Sinnoh/Unova/Kalos already use (engine/encounter/
// pokemon-encounter-engine.ts) — nothing here invents or duplicates a
// rarity value; this file only ever supplies `encounterWeight`,
// `minimumLevel`, and `maximumLevel`.
//
// ALOLA RARITY AUDIT (approved) — generation-7-pokemon-data.ts's own real
// PokemonSpecies.rarity was manually revisited after this file's initial
// Phase 6 landing (see that file's own "ALOLA RARITY AUDIT" comment for the
// exact before/after per species). This file's `encounterWeight` and
// `minimumLevel`/`maximumLevel` values below were updated to match wherever
// a species' real rarity tier (or evolution-target status within its new
// tier) changed as a result — the weight/level convention itself is
// unchanged; only the inputs to it moved for 13 species (trumbeak,
// crabrawler, salandit, raticate-alola, muk-alola: common -> rare;
// togedemaru, wishiwashi, shiinotic, bewear, comfey, pyukumuku: rare ->
// common; golem-alola: rare -> very-rare; marowak-alola: common ->
// very-rare). No zone assignment, encounter order, or species membership
// changed — the approved 44/19/18/14/13 distribution and its 108 species
// are exactly as before.
//
// The effective encounter-rarity system (engine/encounter-rarity/
// get-effective-encounter-rarity.ts) continues to apply automatically and
// without any Alola-specific code: four species below have a real
// PokemonSpecies.rarity of "rare" or "common" but resolve to effective
// "very-rare" for Stage 1 tier selection purely because they're direct
// evolution-item targets (the same already-generalized rule every prior
// region's Stone-style items already exercise, driven entirely by
// EVOLUTION_ITEM_EVOLUTIONS in data/pokemon/pokemon-evolutions.ts, never a
// separate hardcoded list here) — Vikavolt (real rare, Thunder Stone from
// Charjabug), Alolan Sandslash (real common, Ice Stone from Alolan
// Sandshrew), Alolan Ninetales (real rare, Ice Stone from Alolan Vulpix),
// and Alolan Exeggutor (real common, Leaf Stone from Exeggcute) — this
// audit deliberately did NOT change any of these four to real "very-rare"
// merely because they're item-evolution targets; their real rarity stays
// exactly what the audit approved, and only the generic effective-rarity
// system promotes them for encounter purposes. Alolan Raichu is ALSO a
// Thunder Stone target (from Pikachu) but its real rarity is independently
// "very-rare" (unaffected by this audit), so the item-evolution rule
// produces no observable change for it. Their own PokemonSpecies.rarity
// stays unmodified throughout (battle UI, capture odds, Pokédex all keep
// reading that unmodified value) — only Stage 1's tier draw treats them as
// very-rare, exactly like Roserade/Mismagius/Weavile/etc. already work in
// Sinnoh, Simisage/Whimsicott/etc. already work in Unova, and
// Florges/Aegislash/etc. already work in Kalos. Alolan Marowak (Cubone's
// second BRANCH_EVOLUTIONS target, not an item evolution) is now real
// "very-rare" per this audit — independent of the item-evolution system,
// which never touches it (BRANCH_EVOLUTIONS targets are never members of
// EVOLUTION_ITEM_EVOLUTIONS). The three Lycanroc Forms (Rockruff's own
// BRANCH_EVOLUTIONS targets) are unaffected by this audit and keep their
// real "rare" rarity, weighted as ordinary rare evolution targets (see
// below).
//
// encounterWeight convention — the exact same convention Johto/Hoenn/
// Sinnoh/Unova/Kalos already established:
//   - legendary species (the four Tapu, the Cosmog line incl. Solgaleo/
//     Lunala, all 11 Ultra Beasts incl. the Poipole/Naganadel line,
//     Necrozma, Magearna, Marshadow, Zeraora, and the Meltan line): 1
//   - "very-rare" species (the three Alola starter lines, the Jangmo-o
//     pseudo-legendary line, and — per the Alola Rarity Audit — Alolan
//     Raichu, Alolan Golem, and Alolan Marowak, 15 real-very-rare entries
//     total — plus the four evolution-item targets above, whose real
//     rarity is "rare" or "common" but whose EFFECTIVE tier is
//     "very-rare"): 5, uniformly
//   - "rare" species reachable only by evolving (a level-evolution OR
//     BRANCH_EVOLUTIONS target per the canonical evolution registry,
//     data/pokemon/pokemon-evolutions.ts — e.g. Trumbeak, Toucannon,
//     Gumshoos, Ribombee, Lurantis, Tsareena, Silvally, Crabominable,
//     Toxapex, Araquanid, Golisopod, Palossand, Mudsdale, Salazzle, Alolan
//     Raticate, Alolan Muk, and all three Lycanroc Forms — the same
//     "branch target with real rarity 'rare' gets the ordinary
//     evolution-target weight" rule Ninjask/Shedinja already established in
//     Hoenn): 5
//   - "rare" species with no such predecessor (a standalone rare mon —
//     Crabrawler, Salandit, Passimian, Bruxish, Minior, Komala, Turtonator,
//     Oricorio, Drampa, Oranguru, Mimikyu, Dhelmise): 10
//   - "common" species: 20, uniformly (never demoted for being an evolution
//     target — e.g. Charjabug/Steenee/Persian (Alolan)/Dugtrio (Alolan)/
//     Graveler (Alolan)/Shiinotic/Bewear/Togedemaru/Wishiwashi/Comfey/
//     Pyukumuku all stay at the standard common weight, matching the same
//     rule every prior region already follows).
// Evolution-target status (for the level/branch-evolution "rare" bucket
// above) is read directly from getLevelEvolution/getAllEvolutionItemEvolutionEntries/
// getBranchEvolution in data/pokemon/pokemon-evolutions.ts — never a
// separate hardcoded Alola evolution-target list.
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility via
// deriveSpeciesWildLevelRange; see pokemon-encounter-engine.ts's own doc
// comment) and never reads these two fields. Values are placeholders in the
// same weight-correlated band Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos's own
// data already uses (weight 20 -> 2-6, weight 10 -> 4-8, weight 5 -> 6-10,
// weight 1/legendary -> 55-60) purely so they read as sensible data, not
// because anything consumes them as the actual generated range.
export const ALOLA_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של אלולה",
    description: "שדות ומרחבים פתוחים שבהם חיים פוקימוני אלולה הנפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "rowlet", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dartrix", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "decidueye", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pikipek", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "trumbeak", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "toucannon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "yungoos", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gumshoos", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "grubbin", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "charjabug", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "vikavolt", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "cutiefly", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ribombee", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "fomantis", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lurantis", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "morelull", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "shiinotic", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "stufful", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bewear", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bounsweet", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "steenee", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "tsareena", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "comfey", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "passimian", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "type-null", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "silvally", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "togedemaru", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "tapu-koko", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "tapu-bulu", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "buzzwole", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "pheromosa", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "xurkitree", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "kartana", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "poipole", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "naganadel", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "zeraora", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "rattata-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "raticate-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "raichu-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "meowth-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "persian-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "grimer-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "muk-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "exeggutor-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של אלולה",
    description: "מפרצים וחופים שקטים שבהם שוחים פוקימוני המים של אלולה.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "popplio", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "brionne", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "primarina", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "crabrawler", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "crabominable", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wishiwashi", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mareanie", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "toxapex", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dewpider", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "araquanid", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "wimpod", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "golisopod", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sandygast", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "palossand", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pyukumuku", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bruxish", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "tapu-fini", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "vulpix-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "ninetales-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "cave",
    name: "מערת אלולה",
    description: "מערה עמוקה וחשוכה שבה מסתתרים פוקימוני אלולה נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "mudbray", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "mudsdale", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "minior", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "komala", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "jangmo-o", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "hakamo-o", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "kommo-o", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "celesteela", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "stakataka", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "meltan", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "melmetal", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "sandshrew-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sandslash-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "diglett-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dugtrio-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "geodude-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "graveler-alola", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "golem-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של אלולה",
    description: "אדמה געשית לוהטת שבה חיים פוקימוני האש וההרים של אלולה.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "litten", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "torracat", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "incineroar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rockruff", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lycanroc", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lycanroc-midnight", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lycanroc-dusk", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "salandit", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "salazzle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "turtonator", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "oricorio", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "drampa", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "magearna", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "blacephalon", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות של אלולה",
    description: "בית נטוש שבו מסתתרים פוקימוני הרוח והנפש של אלולה.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "oranguru", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "mimikyu", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "dhelmise", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "tapu-lele", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "cosmog", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "cosmoem", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "solgaleo", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "lunala", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "nihilego", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "guzzlord", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "necrozma", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "marshadow", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "marowak-alola", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
];
