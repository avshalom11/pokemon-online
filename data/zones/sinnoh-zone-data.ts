import type { Zone } from "@/shared/types/zone";

// Sinnoh's own six zone encounter pools (Sinnoh Encounter Tables Phase 5) —
// a sibling to kanto-zone-data.ts, johto-zone-data.ts, and
// hoenn-zone-data.ts, never a shared table with any of them. Same zone ids
// as every other region (grassland/water/cave/lava/beach/haunted-house),
// but each one's `encounters` array here draws only from Sinnoh species
// (#387-#493) plus the five Rotom alternate forms and the one Giratina
// alternate form, exactly the "same zone id, different region, different
// pool" shape those three files already establish.
//
// Coverage: all 107 official Sinnoh base species (#387-#493) plus the five
// Rotom alternate forms (rotom-heat/wash/frost/fan/mow) and the one
// Giratina alternate form (giratina-origin — see features/pokemon/forms's
// own Forms architecture; all Rotom forms stay grouped under the single
// #0479 Pokédex entry, both Giratina forms stay grouped under the single
// #0487 entry, this file never creates a duplicate National Dex row) = 113
// entries, PLUS the 7 Pre-Paldea species (#899-905, appended to
// generation-4-pokemon-data.ts — Sinnoh-owned despite sitting outside the
// #387-493 range) added by the Pre-Paldea Encounter Integration step:
// Wyrdeer (grassland), Ursaluna/Kleavor/Sneasler (cave), Basculegion/
// Overqwil (water), Enamorus (haunted-house) = 120 entries, PLUS the 17
// Pre-Paldea Hisuian Forms (also Sinnoh-owned per generation-4-pokemon-
// data.ts's own top-of-file note) added by the Pre-Paldea 17 Hisuian
// Forms Encounter Integration step: Voltorb-Hisui/Electrode-Hisui/
// Lilligant-Hisui/Decidueye-Hisui (grassland), Qwilfish-Hisui/Basculin-
// Hisui/Samurott-Hisui (water), Sneasel-Hisui/Sliggoo-Hisui/Goodra-Hisui/
// Avalugg-Hisui (cave), Growlithe-Hisui/Arcanine-Hisui/Typhlosion-Hisui
// (lava), Braviary-Hisui (beach), Zorua-Hisui/Zoroark-Hisui
// (haunted-house) — every one of these 17 placements is user-approved,
// never derived from canonical in-game habitat. Total = 137 entries below.
// No species is split across zones, none is omitted, none is duplicated —
// this exact distribution was reviewed and approved zone-by-zone before
// this file was written (see the project's own Sinnoh Encounter Planning
// analysis), with the 7 Pre-Paldea species and the 17 Pre-Paldea Hisuian
// Forms each reviewed and approved separately afterward.
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity tier
// from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-4-pokemon-data.ts) via the SAME two-stage engine Kanto/Johto/
// Hoenn already use (engine/encounter/pokemon-encounter-engine.ts) —
// nothing here invents or duplicates a rarity value; this file only ever
// supplies `encounterWeight`, `minimumLevel`, and `maximumLevel`. The
// effective encounter-rarity system (engine/encounter-rarity/
// get-effective-encounter-rarity.ts) continues to apply automatically and
// without any Sinnoh-specific code.
//
// Sinnoh Rarity Audit approved-design-change: Phione and all six Rotom
// entries (base + 5 alternate forms) moved from real "rare" to real
// "legendary"; Porygon-Z, Magmortar, Electivire, Rhyperior, and Magnezone
// moved from real "rare" to real "very-rare" — see
// generation-4-pokemon-data.ts's own per-species rarity fields for the one
// source of truth. Porygon-Z/Magmortar/Electivire/Rhyperior are still
// evolution-item targets (Dubious Disc/Magmarizer/Electirizer/Protector
// respectively), but since their real rarity is now already "very-rare",
// this is no longer an override — their effective rarity simply equals
// their real rarity, same as any other very-rare species. Magnezone was
// never an evolution-item target (it evolves from Magneton by level) and
// so was never part of the override system; its change is a direct rarity
// reassignment only.
//
// Ten species below still have a real PokemonSpecies.rarity of "rare" but
// resolve to effective "very-rare" for Stage 1 tier selection purely
// because they're direct evolution-item targets (the same already-
// generalized rule every prior region's Stone/King's-Rock-style items
// already exercise) — Roserade (Shiny Stone), Mismagius/Honchkrow (Dusk
// Stone), Weavile (Razor Claw), Togekiss (Shiny Stone), Gliscor (Razor
// Fang), Gallade (Dawn Stone), Dusknoir (Reaper Cloth), Froslass (Dawn
// Stone), and Leafeon/Glaceon (Leaf Stone / Ice Stone). Their own
// PokemonSpecies.rarity stays "rare" throughout (battle UI, capture odds,
// Pokédex all keep reading that unmodified value) — only Stage 1's tier
// draw treats them as very-rare, exactly like Shiftry/Ludicolo/Delcatty/
// Huntail/Gorebyss already work in Hoenn. Cross-generation LEVEL-evolution
// targets introduced in Sinnoh (Ambipom, Lickilicky, Tangrowth, Yanmega,
// Mamoswine, Probopass, and every plain in-region evolution target) are
// deliberately NOT part of this override — only evolution-ITEM targets are,
// matching the existing rule exactly.
//
// encounterWeight convention — the exact same convention Johto/Hoenn
// already established:
//   - legendary/mythical species: 1 (now including Phione and every Rotom
//     entry)
//   - "very-rare" species (the three Sinnoh starter lines, the Gible/
//     Garchomp line, and — after the Rarity Audit — Porygon-Z/Magmortar/
//     Electivire/Rhyperior/Magnezone — this catalog's own "prize" tier): 5,
//     uniformly
//   - "rare" species reachable only by evolving (a level/item/branch
//     TARGET per the canonical evolution tables — e.g. Staraptor, Luxray,
//     Roserade, Wormadam/Mothim, Vespiquen, Lucario, Weavile, Togekiss):
//     5
//   - "rare" species with no such predecessor (a standalone rare mon —
//     Pachirisu, Chatot, Spiritomb, Carnivine, since a Form is never itself
//     an evolution-table target): 10
//   - "common" species: 20, uniformly (never demoted for being an
//     evolution target).
// Every Rotom form (rotom, rotom-heat, rotom-wash, rotom-frost, rotom-fan,
// rotom-mow) and both Giratina forms (giratina, giratina-origin) are
// independently encounterable per the approved distribution — Rotom's five
// alternate forms are spread across Grassland/Water/Cave/Lava/Haunted House
// by elemental theme (matching how their own learnsets were tuned per
// form), while both Giratina forms stay together in Haunted House (their
// shared Distortion World lore, unlike Rotom's genuinely distinct per-form
// typing, gives no reason to split them) — no formOf/formLabel/spriteId/
// base stats/learnsets/Pokédex grouping is touched by this file; the Forms
// architecture still shows exactly one official Pokédex row for Rotom and
// one for Giratina.
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility via
// deriveSpeciesWildLevelRange; see pokemon-encounter-engine.ts's own doc
// comment) and never reads these two fields. Values are placeholders in the
// same weight-correlated band Kanto/Johto/Hoenn's own data already uses
// (weight 20 -> 2-6, weight 10 -> 4-8, weight 5 -> 6-10, weight 1/legendary
// -> 55-60) purely so they read as sensible data, not because anything
// consumes them as the actual generated range. No branch- or item-evolution
// level behavior is touched by this file.
export const SINNOH_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של סינו",
    description: "שדות ירוקים ומרחבים פתוחים שבהם חיים פוקימוני סינו הנפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "turtwig", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "grotle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "torterra", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "starly", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "staravia", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "staraptor", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "kricketot", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "kricketune", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "shinx", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "luxio", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "luxray", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "budew", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "roserade", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "burmy", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "wormadam", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mothim", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "combee", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "vespiquen", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pachirisu", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "cherubi", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "cherrim", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "ambipom", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "buneary", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lopunny", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "glameow", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "purugly", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bonsly", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "happiny", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "chatot", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "munchlax", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "croagunk", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "toxicroak", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "carnivine", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "tangrowth", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "electivire", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "togekiss", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "yanmega", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "leafeon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "shaymin", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "riolu", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lucario", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "magnezone", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "regigigas", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "arceus", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      // Pre-Paldea encounter integration — Wyrdeer (real rare, a level-40
      // evolution target of Stantler) uses this file's own "rare evolution
      // target" weight (5), same band as Ambipom/Luxray/Staraptor above.
      { pokemonId: "wyrdeer", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      // Pre-Paldea 17 Hisuian Forms — user-approved zone placement.
      // Voltorb-Hisui/Electrode-Hisui are real common (weight 20, uniform).
      // Lilligant-Hisui is real rare, an evolution-item target of Petilil
      // (weight 5). Decidueye-Hisui is real very-rare (weight 5, uniform).
      { pokemonId: "voltorb-hisui", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "electrode-hisui", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lilligant-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "decidueye-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של סינו",
    description: "אגמים ומפרצים שקטים שבהם שוחים פוקימוני המים של סינו.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "piplup", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "prinplup", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "empoleon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "phione", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "manaphy", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "glaceon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "palkia", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "finneon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "lumineon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mantyke", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      // Pre-Paldea encounter integration — both real rare, both level-40
      // evolution targets (Basculin -> Basculegion, Qwilfish -> Overqwil),
      // this file's own "rare evolution target" weight (5).
      { pokemonId: "basculegion", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "overqwil", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      // Pre-Paldea 17 Hisuian Forms — user-approved zone placement.
      // Qwilfish-Hisui and Basculin-Hisui are real rare with no
      // predecessor of their own (standalone, weight 10). Samurott-Hisui
      // is real very-rare (weight 5, uniform).
      { pokemonId: "qwilfish-hisui", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "basculin-hisui", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "samurott-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "cave",
    name: "מערת סינו",
    description: "מערה עמוקה וחשוכה שבה מסתתרים פוקימוני סינו נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "cranidos", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "rampardos", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "shieldon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bastiodon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "snover", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "abomasnow", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "gliscor", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mamoswine", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "probopass", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      // Pre-Paldea encounter integration — Ursaluna and Sneasler are real
      // rare, level-40 evolution targets (Ursaring -> Ursaluna, Sneasel ->
      // Sneasler); Kleavor is real very-rare (Scyther's second, independent
      // level-40 branch). All three use this file's own uniform weight-5
      // band ("rare evolution target" and "very-rare" both resolve to 5).
      { pokemonId: "ursaluna", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "kleavor", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sneasler", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      // Pre-Paldea 17 Hisuian Forms — user-approved zone placement.
      // Sneasel-Hisui is real common (weight 20, uniform). Sliggoo-Hisui
      // and Goodra-Hisui are real very-rare (weight 5, uniform).
      // Avalugg-Hisui is real rare, a Branch evolution target of Bergmite
      // (weight 5, "rare evolution target").
      { pokemonId: "sneasel-hisui", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "sliggoo-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "goodra-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "avalugg-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של סינו",
    description: "אדמה געשית לוהטת שבה חיים פוקימוני האש וההרים של סינו.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "chimchar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "monferno", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "infernape", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "skorupi", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "drapion", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rhyperior", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "magmortar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "heatran", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "gible", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "gabite", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "garchomp", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "dialga", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      // Pre-Paldea 17 Hisuian Forms — user-approved zone placement.
      // Growlithe-Hisui is real common (weight 20, uniform). Arcanine-
      // Hisui is real rare, an evolution-item target of Growlithe-Hisui
      // (weight 5, "rare evolution target"). Typhlosion-Hisui is real
      // very-rare (weight 5, uniform).
      { pokemonId: "growlithe-hisui", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "arcanine-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "typhlosion-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "beach",
    name: "חוף סינו",
    description: "חוף שקט שבו נחים פוקימוני סינו הידידותיים.",
    imageUrl: "/zones/beach.png",

    encounters: [
      { pokemonId: "buizel", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "floatzel", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "shellos", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gastrodon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "lickilicky", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bidoof", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bibarel", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "hippopotas", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "hippowdon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      // Pre-Paldea 17 Hisuian Forms — user-approved zone placement.
      // Braviary-Hisui is real rare, a Branch evolution target of Rufflet
      // (weight 5, "rare evolution target").
      { pokemonId: "braviary-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות של סינו",
    description: "בית נטוש שבו מסתתרים פוקימוני הרוח והנפש של סינו.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "drifloon", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "drifblim", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mismagius", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "honchkrow", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "chingling", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "spiritomb", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "dusknoir", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "froslass", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rotom", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "giratina", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "giratina-origin", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "darkrai", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "stunky", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "skuntank", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "mime-jr", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gallade", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rotom-fan", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "rotom-mow", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "rotom-wash", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "bronzor", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "bronzong", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "weavile", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "porygon-z", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "rotom-frost", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "uxie", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "mesprit", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "azelf", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "rotom-heat", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "cresselia", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      // Pre-Paldea encounter integration — Enamorus is real legendary, this
      // file's own uniform legendary weight (1) and level band (55-60),
      // same as every other legendary encounter above.
      { pokemonId: "enamorus", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      // Pre-Paldea 17 Hisuian Forms — user-approved zone placement.
      // Zorua-Hisui and Zoroark-Hisui are both real very-rare (weight 5,
      // uniform).
      { pokemonId: "zorua-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zoroark-hisui", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
];
