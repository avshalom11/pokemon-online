import type { Zone } from "@/shared/types/zone";

// Kalos's own FIVE zone encounter pools (Kalos Encounter Tables Phase 6) —
// a sibling to kanto-zone-data.ts, johto-zone-data.ts, hoenn-zone-data.ts,
// sinnoh-zone-data.ts, and unova-zone-data.ts, never a shared table with
// any of them. Kalos is a deliberate five-zone region (Kalos Phase 4/5's
// own approved map design) — grassland/water/cave/lava/haunted-house only,
// NO beach — matching the same five polygons data/maps/kalos-map-config.ts
// already draws. The global ZoneId type (shared/types/zone.ts) still lists
// all six ids for every other region; this file simply never creates a
// "beach" entry for Kalos.
//
// Coverage: all 72 official Kalos base species (#650-#721) plus the one
// approved alternate form (hoopa-unbound — see features/pokemon/forms's
// own Forms architecture; the form stays grouped under Hoopa's single
// National Dex row, this file never creates a duplicate entry) = 73 total
// entries below. This exact distribution — species-per-zone, encounter
// order, and totals (21/10/13/10/19) — is FINAL and manually approved;
// nothing here may move a species, rebalance a zone, substitute a species,
// or add/remove a Form. Zygarde is deliberately in Cave (not Lava) and
// Hoopa/Hoopa Unbound are deliberately both in Haunted House, per this
// phase's own explicit approved distribution.
//
// Rarity: every `pokemonId` below resolves its actual encounter-rarity tier
// from that species' own PokemonSpecies.rarity (data/pokemon/
// generation-6-pokemon-data.ts) via the SAME two-stage engine Kanto/Johto/
// Hoenn/Sinnoh/Unova already use (engine/encounter/
// pokemon-encounter-engine.ts) — nothing here invents or duplicates a
// rarity value; this file only ever supplies `encounterWeight`,
// `minimumLevel`, and `maximumLevel`. The effective encounter-rarity system
// (engine/encounter-rarity/get-effective-encounter-rarity.ts) continues to
// apply automatically and without any Kalos-specific code: six species
// below have a real PokemonSpecies.rarity of "rare" but resolve to
// effective "very-rare" for Stage 1 tier selection purely because they're
// direct evolution-item targets (the same already-generalized rule every
// prior region's Stone-style items already exercise, driven entirely by
// EVOLUTION_ITEM_EVOLUTIONS in data/pokemon/pokemon-evolutions.ts, never a
// separate hardcoded list here) — Florges (Shiny Stone), Aegislash (Dusk
// Stone), Aromatisse (Shiny Stone), Slurpuff (Shiny Stone), Heliolisk
// (Thunder Stone — the Kalos evolution correction, never Sun Stone), and
// Sylveon (Shiny Stone, evolving from Eevee — a Kanto species not itself
// in this table, but Sylveon's own row here is unaffected by which region
// Eevee belongs to). Their own PokemonSpecies.rarity stays "rare"
// throughout (battle UI, capture odds, Pokédex all keep reading that
// unmodified value) — only Stage 1's tier draw treats them as very-rare,
// exactly like Roserade/Mismagius/Weavile/etc. already work in Sinnoh and
// Simisage/Whimsicott/etc. already work in Unova. This phase does not
// modify data/pokemon/generation-6-pokemon-data.ts at all — a separate
// future Kalos Rarity Audit is the only place any real rarity may change.
//
// encounterWeight convention — the exact same convention Johto/Hoenn/
// Sinnoh/Unova already established:
//   - legendary/mythical species (Xerneas, Yveltal, Zygarde, Diancie,
//     Hoopa incl. Unbound Form, Volcanion): 1
//   - "very-rare" species (the three Kalos starter lines and the
//     Goomy/Sliggoo/Goodra pseudo-legendary line — this catalog's own
//     "prize" tier — plus the six evolution-item targets above, whose real
//     rarity is "rare" but whose EFFECTIVE tier is "very-rare"): 5,
//     uniformly
//   - "rare" species reachable only by evolving (a level-evolution TARGET
//     per the canonical evolution registry, data/pokemon/
//     pokemon-evolutions.ts — e.g. Diggersby, Talonflame, Vivillon, Pyroar,
//     Gogoat, Pangoro, Meowstic, Malamar, Barbaracle, Dragalge, Clawitzer,
//     Tyrantrum, Aurorus, Trevenant, Gourgeist, Avalugg, Noivern): 5
//   - "rare" species with no such predecessor (a standalone rare mon —
//     Furfrou, Hawlucha, Dedenne, Carbink, Klefki): 10
//   - "common" species: 20, uniformly (never demoted for being an
//     evolution target — e.g. Fletchinder/Spewpa/Floette/Doublade stay at
//     the standard common weight, matching the same rule every prior
//     region already follows).
// Evolution-target status (for the level-evolution "rare" bucket above) is
// read directly from getLevelEvolution/getAllEvolutionItemEvolutionEntries
// in data/pokemon/pokemon-evolutions.ts — never a separate hardcoded Kalos
// evolution-target list.
//
// Hoopa Unbound is independently encounterable in Haunted House alongside
// base Hoopa — two separate ZoneEncounter entries, each its own full-tier
// legendary entry at weight 1, no special-casing beyond what every other
// legendary already gets, since each form is already its own full
// PokemonSpecies row (features/pokemon/forms) with its own rarity:
// "legendary". No Prison Bottle mechanic and no runtime form-switching
// exist anywhere in this file — formOf/formLabel/spriteId/base stats/
// learnsets/Pokédex grouping are untouched by this file.
//
// minimumLevel/maximumLevel: populated only because the ZoneEncounter type
// still requires them — the real wild level is derived elsewhere (player-
// level scaling intersected with evolution-stage eligibility via
// deriveSpeciesWildLevelRange; see pokemon-encounter-engine.ts's own doc
// comment) and never reads these two fields. Values are placeholders in the
// same weight-correlated band Kanto/Johto/Hoenn/Sinnoh/Unova's own data
// already uses (weight 20 -> 2-6, weight 10 -> 4-8, weight 5 -> 6-10,
// weight 1/legendary -> 55-60) purely so they read as sensible data, not
// because anything consumes them as the actual generated range.
export const KALOS_ZONE_DATA: Zone[] = [
  {
    id: "grassland",
    name: "אזור הדשא של קאלוס",
    description: "שדות ירוקים ומרחבים פתוחים שבהם חיים פוקימוני קאלוס הנפוצים.",
    imageUrl: "/zones/grassland.png",

    recommendedTypes: ["grass", "electric"],

    encounters: [
      { pokemonId: "chespin", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "quilladin", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "chesnaught", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bunnelby", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "diggersby", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "fletchling", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "fletchinder", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "scatterbug", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "spewpa", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "vivillon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "flabebe", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "floette", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "florges", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "skiddo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gogoat", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pancham", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "pangoro", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "furfrou", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "xerneas", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "hawlucha", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "dedenne", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
    ],
  },
  {
    id: "water",
    name: "אזור המים של קאלוס",
    description: "אגמים ומפרצים שקטים שבהם שוחים פוקימוני המים של קאלוס.",
    imageUrl: "/zones/water.png",

    encounters: [
      { pokemonId: "froakie", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "frogadier", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "greninja", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "clauncher", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "clawitzer", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "goomy", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sliggoo", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "goodra", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "skrelp", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "dragalge", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "cave",
    name: "מערת קאלוס",
    description: "מערה עמוקה וחשוכה שבה מסתתרים פוקימוני קאלוס נדירים.",
    imageUrl: "/zones/cave.png",

    encounters: [
      { pokemonId: "binacle", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "barbaracle", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "tyrunt", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "tyrantrum", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "amaura", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "aurorus", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "carbink", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "diancie", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "noibat", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "noivern", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "bergmite", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "avalugg", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "zygarde", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
  {
    id: "lava",
    name: "אזור הלבה של קאלוס",
    description: "אדמה געשית לוהטת שבה חיים פוקימוני האש וההרים של קאלוס.",
    imageUrl: "/zones/lava.png",

    encounters: [
      { pokemonId: "fennekin", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "braixen", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "delphox", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "helioptile", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "heliolisk", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "yveltal", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "litleo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "pyroar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "volcanion", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "talonflame", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
    ],
  },
  {
    id: "haunted-house",
    name: "בית הרוחות של קאלוס",
    description: "בית נטוש שבו מסתתרים פוקימוני הרוח והנפש של קאלוס.",
    imageUrl: "/zones/haunted-house.png",

    encounters: [
      { pokemonId: "phantump", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "trevenant", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "pumpkaboo", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "gourgeist", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "sylveon", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "espurr", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "meowstic", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "spritzee", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "aromatisse", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "swirlix", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "slurpuff", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "honedge", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "doublade", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "aegislash", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "klefki", minimumLevel: 4, maximumLevel: 8, encounterWeight: 10 },
      { pokemonId: "hoopa", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
      { pokemonId: "inkay", minimumLevel: 2, maximumLevel: 6, encounterWeight: 20 },
      { pokemonId: "malamar", minimumLevel: 6, maximumLevel: 10, encounterWeight: 5 },
      { pokemonId: "hoopa-unbound", minimumLevel: 55, maximumLevel: 60, encounterWeight: 1 },
    ],
  },
];
