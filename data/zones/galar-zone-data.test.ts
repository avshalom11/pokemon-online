import assert from "node:assert/strict";
import { test } from "node:test";

import { ALOLA_ZONE_DATA } from "./alola-zone-data.ts";
import { GALAR_ZONE_DATA } from "./galar-zone-data.ts";
import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KALOS_ZONE_DATA } from "./kalos-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data.ts";
import { UNOVA_ZONE_DATA } from "./unova-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { getEffectiveEncounterRarity } from "../../engine/encounter-rarity/get-effective-encounter-rarity.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Galar Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required, checked
// directly against the canonical species catalog and Forms data rather
// than a second hardcoded species list here.

function allGalarEncounters() {
  return GALAR_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

// The exact approved Galar internal-id set: 89 base species (#810-#898,
// formOf undefined) + the 19 approved Galarian Forms. Galarian Forms
// deliberately SHARE their Kanto/Johto/Hoenn/Unova base's National Dex
// number (e.g. meowth-galar is dex #52, same as Kanto meowth) — so, same
// as Alola, "dexNumber in range" is not a valid region-isolation test here
// (it would incorrectly reject every approved Galarian Form). This is the
// one place that distinction matters; every test below derives membership
// from this explicit id set, never from a dex-number bound.
const GALARIAN_FORM_IDS = [
  "meowth-galar", "ponyta-galar", "rapidash-galar", "slowpoke-galar", "slowbro-galar",
  "farfetchd-galar", "weezing-galar", "mr-mime-galar", "articuno-galar", "zapdos-galar",
  "moltres-galar", "slowking-galar", "corsola-galar", "zigzagoon-galar", "linoone-galar",
  "darumaka-galar", "darmanitan-galar", "yamask-galar", "stunfisk-galar",
];

function galarBaseSpeciesIds() {
  return POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 810 && species.dexNumber <= 898
  ).map((species) => species.id);
}

function approvedGalarIdSet() {
  return new Set([...galarBaseSpeciesIds(), ...GALARIAN_FORM_IDS]);
}

// --- 1-3: five zones, exact ids, no beach ---

test("Galar has exactly 5 encounter zones", () => {
  assert.equal(GALAR_ZONE_DATA.length, 5);
});

test("Galar zone ids are exactly grassland/water/cave/lava/haunted-house, in that order", () => {
  assert.deepEqual(
    GALAR_ZONE_DATA.map((zone) => zone.id),
    ["grassland", "water", "cave", "lava", "haunted-house"]
  );
});

test("Beach is absent from Galar zone data (Galar is a deliberate five-zone region)", () => {
  const zoneIds = GALAR_ZONE_DATA.map((zone) => zone.id);
  assert.ok(!zoneIds.includes("beach" as (typeof zoneIds)[number]));
});

// --- 4-6: zone counts, total, uniqueness ---

test("zone counts match the approved distribution exactly (35/18/17/16/22)", () => {
  const counts = Object.fromEntries(GALAR_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 35,
    water: 18,
    cave: 17,
    lava: 16,
    "haunted-house": 22,
  });
});

test("Galar contains exactly 108 encounter entries", () => {
  assert.equal(allGalarEncounters().length, 108);
});

test("there are exactly 108 unique species ids across all Galar zones", () => {
  const ids = new Set(allGalarEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 108);
});

// --- 7-9: base species + Forms coverage ---

test("every official Galar base species (#810-#898) appears exactly once", () => {
  const baseIds = galarBaseSpeciesIds();
  assert.equal(baseIds.length, 89, "test assumption: 89 official Galar base species exist");

  const encounterIds = allGalarEncounters().map((encounter) => encounter.pokemonId);
  const missing = baseIds.filter((id) => !encounterIds.includes(id));
  assert.deepEqual(missing, [], "no Galar base species may be missing from the encounter tables");

  for (const id of baseIds) {
    assert.equal(encounterIds.filter((candidate) => candidate === id).length, 1, `${id} must appear exactly once`);
  }
});

test("all 19 approved Galarian Forms appear exactly once", () => {
  const ids = allGalarEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(GALARIAN_FORM_IDS.length, 19, "test assumption: 19 approved Galarian Forms");
  for (const id of GALARIAN_FORM_IDS) {
    assert.equal(ids.filter((candidate) => candidate === id).length, 1, `${id} must appear exactly once`);
  }
});

// --- 10-11: no duplicates, no unknown ids ---

test("no duplicate species ids across all Galar zones", () => {
  const ids = allGalarEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every referenced Galar species id resolves in the canonical species catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = allGalarEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("no unapproved Form appears — the Galar encounter table equals the approved internal-id set exactly", () => {
  // Region isolation, done correctly: Galarian Forms share their Kanto/
  // Johto/Hoenn/Unova base's dexNumber, so a naive "dexNumber >= 810" check
  // would wrongly reject every one of them. Instead this asserts the
  // encounter table's id set is EXACTLY the approved set (89 base + 19
  // Forms), catching both an unapproved addition and a missing approved
  // entry.
  const encounterIds = new Set(allGalarEncounters().map((encounter) => encounter.pokemonId));
  const approved = approvedGalarIdSet();
  assert.equal(approved.size, 108, "test assumption: 108 approved Galar internal ids");
  assert.deepEqual([...encounterIds].sort(), [...approved].sort());
});

test("no earlier-region species id (Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos/Alola's own encounter pools) appears in the Galar pools", () => {
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...UNOVA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...KALOS_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...ALOLA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  const overlap = allGalarEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => otherRegionIds.has(id));
  assert.deepEqual(overlap, []);
});

test("every zone contains at least one valid encounter", () => {
  for (const zone of GALAR_ZONE_DATA) {
    assert.ok(zone.encounters.length > 0, `${zone.id} must have at least one encounter`);
  }
});

// --- 12: approved zone-membership locking ---
//
// Locks the EXACT approved species membership per zone (not merely the
// counts) so a future refactor can never silently move a Pokémon between
// Galar zones while the totals still add up. The membership below is
// copied verbatim from the Galar Phase 6 approved distribution.
const APPROVED_MEMBERSHIP: Record<string, string[]> = {
  grassland: [
    "grookey", "thwackey", "rillaboom", "skwovet", "greedent", "rookidee", "corvisquire", "corviknight",
    "blipbug", "dottler", "orbeetle", "nickit", "thievul", "gossifleur", "eldegoss", "wooloo", "dubwool",
    "yamper", "boltund", "applin", "flapple", "appletun", "falinks", "morpeko", "sirfetchd", "zarude",
    "farfetchd-galar", "zapdos-galar", "zigzagoon-galar", "linoone-galar", "arctozolt", "regieleki",
    "obstagoon", "snom", "frosmoth",
  ],
  water: [
    "sobble", "drizzile", "inteleon", "dracovish", "arctovish", "slowpoke-galar", "slowbro-galar",
    "slowking-galar", "eiscue", "articuno-galar", "chewtle", "drednaw", "cramorant", "arrokuda",
    "barraskewda", "clobbopus", "grapploct", "pincurchin",
  ],
  cave: [
    "rolycoly", "carkol", "coalossal", "silicobra", "sandaconda", "perrserker", "stonjourner", "duraludon",
    "glastrier", "meowth-galar", "darumaka-galar", "darmanitan-galar", "stunfisk-galar", "cufant",
    "copperajah", "runerigus", "yamask-galar",
  ],
  lava: [
    "scorbunny", "raboot", "cinderace", "toxel", "toxtricity", "sizzlipede", "centiskorch", "zacian",
    "zamazenta", "kubfu", "urshifu", "moltres-galar", "ponyta-galar", "rapidash-galar", "dracozolt",
    "weezing-galar",
  ],
  "haunted-house": [
    "sinistea", "polteageist", "hatenna", "hattrem", "hatterene", "impidimp", "morgrem", "grimmsnarl",
    "cursola", "mr-rime", "dreepy", "drakloak", "dragapult", "eternatus", "spectrier", "calyrex",
    "corsola-galar", "milcery", "alcremie", "indeedee", "regidrago", "mr-mime-galar",
  ],
};

test("the approved zone membership (Galar Phase 6 spec) is preserved EXACTLY, in the approved order, per zone", () => {
  for (const zone of GALAR_ZONE_DATA) {
    const actualIds = zone.encounters.map((e) => e.pokemonId);
    const approvedIds = APPROVED_MEMBERSHIP[zone.id];
    assert.ok(approvedIds, `test assumption: an approved membership list must exist for ${zone.id}`);
    assert.deepEqual(actualIds, approvedIds, `${zone.id}'s exact species membership/order must match the Galar Phase 6 approved list`);
  }
});

// --- 13-18: rarity / effective rarity / weights ---

test("the three Galar evolution-item targets resolve to effective very-rare while their real PokemonSpecies.rarity is unchanged", () => {
  const itemEvolutionTargets = ["slowking-galar", "darmanitan-galar", "alcremie"];
  for (const id of itemEvolutionTargets) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `${id}'s real PokemonSpecies.rarity must stay "rare"`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id}'s effective encounter rarity must be "very-rare"`);
  }
});

test("Galar's three starter lines and its own Dreepy/Drakloak/Dragapult pseudo-legendary line are real very-rare and resolve to effective very-rare", () => {
  for (const id of [
    "grookey", "thwackey", "rillaboom",
    "scorbunny", "raboot", "cinderace",
    "sobble", "drizzile", "inteleon",
    "dreepy", "drakloak", "dragapult",
  ]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be real rarity "very-rare"`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id} must resolve to effective "very-rare"`);
  }
});

test("Galar's REAL very-rare set (within the encounter table) is exactly these 12 species, no more and no fewer", () => {
  const veryRareIds = POKEMON_DATA.filter((species) => {
    if (species.rarity !== "very-rare") return false;
    const encounterIds = allGalarEncounters().map((e) => e.pokemonId);
    return encounterIds.includes(species.id);
  })
    .map((species) => species.id)
    .sort();

  assert.deepEqual(
    veryRareIds,
    [
      "grookey", "thwackey", "rillaboom",
      "scorbunny", "raboot", "cinderace",
      "sobble", "drizzile", "inteleon",
      "dreepy", "drakloak", "dragapult",
    ].sort()
  );
});

test("all 14 Galar legendary internal entries are real legendary and resolve to effective legendary, using encounterWeight 1", () => {
  const legendaryIds = [
    "zacian", "zamazenta", "eternatus", "kubfu", "urshifu", "zarude",
    "regieleki", "regidrago", "glastrier", "spectrier", "calyrex",
    "articuno-galar", "zapdos-galar", "moltres-galar",
  ];
  assert.equal(legendaryIds.length, 14, "test assumption: 14 Galar legendary entries");
  const encountersById = new Map(allGalarEncounters().map((e) => [e.pokemonId, e]));
  for (const id of legendaryIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "legendary");
    assert.equal(getEffectiveEncounterRarity(id), "legendary");
    assert.equal(encountersById.get(id)?.encounterWeight, 1, `${id} must use encounterWeight 1`);
  }
});

test("every effective very-rare encounter uses the established Very Rare weight (5)", () => {
  for (const encounter of allGalarEncounters()) {
    if (getEffectiveEncounterRarity(encounter.pokemonId) === "very-rare") {
      assert.equal(encounter.encounterWeight, 5, `${encounter.pokemonId} (effective very-rare) must use encounterWeight 5`);
    }
  }
});

test("every common encounter (real AND effective common) uses the established Common weight (20)", () => {
  for (const encounter of allGalarEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    if (species.rarity === "common" && getEffectiveEncounterRarity(encounter.pokemonId) === "common") {
      assert.equal(encounter.encounterWeight, 20, `${encounter.pokemonId} (common) must use encounterWeight 20`);
    }
  }
});

test("every standalone rare encounter (real rare, not an evolution target of any kind) uses the established Rare weight (10)", () => {
  const standaloneRareIds = [
    "falinks", "morpeko", "farfetchd-galar", "arctozolt", "dracovish", "arctovish", "eiscue",
    "cramorant", "pincurchin", "stonjourner", "duraludon", "stunfisk-galar", "dracozolt",
    "indeedee", "mr-mime-galar",
  ];
  const encountersById = new Map(allGalarEncounters().map((e) => [e.pokemonId, e]));
  for (const id of standaloneRareIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `test assumption: ${id} is real rarity rare`);
    assert.equal(getEffectiveEncounterRarity(id), "rare", `test assumption: ${id} is not an evolution-item target`);
    assert.equal(encountersById.get(id)?.encounterWeight, 10, `${id} (standalone rare) must use encounterWeight 10`);
  }
});

test("every remaining real-rare encounter that IS a level/branch-evolution target uses weight 5, matching the established convention", () => {
  const evolutionTargetRareIds = [
    "greedent", "corviknight", "orbeetle", "thievul", "eldegoss", "dubwool", "boltund",
    "flapple", "appletun", "sirfetchd", "linoone-galar", "obstagoon",
    "coalossal", "sandaconda", "perrserker", "copperajah", "runerigus",
    "toxtricity", "centiskorch", "rapidash-galar",
    "polteageist", "hatterene", "grimmsnarl", "cursola", "mr-rime",
    "drednaw", "barraskewda", "grapploct", "frosmoth",
  ];
  const encountersById = new Map(allGalarEncounters().map((e) => [e.pokemonId, e]));
  for (const id of evolutionTargetRareIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `test assumption: ${id} is real rarity rare`);
    assert.equal(encountersById.get(id)?.encounterWeight, 5, `${id} (rare evolution target) must use encounterWeight 5`);
  }
});

test("real rarity totals across the 108 Galar entries are common 35 / rare 47 / very-rare 12 / legendary 14", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allGalarEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    counts[species.rarity]++;
  }
  assert.deepEqual(counts, { common: 35, rare: 47, "very-rare": 12, legendary: 14 });
});

test("effective rarity totals across the 108 Galar entries are common 35 / rare 44 / very-rare 15 / legendary 14", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allGalarEncounters()) {
    counts[getEffectiveEncounterRarity(encounter.pokemonId)!]++;
  }
  assert.deepEqual(counts, { common: 35, rare: 44, "very-rare": 15, legendary: 14 });
});

test("the real -> effective rarity difference set is exactly the three evolution-item targets, no more and no fewer", () => {
  const diffs = [...approvedGalarIdSet()]
    .filter((id) => {
      const species = POKEMON_DATA.find((candidate) => candidate.id === id)!;
      return getEffectiveEncounterRarity(id) !== species.rarity;
    })
    .sort();

  assert.deepEqual(diffs, ["slowking-galar", "darmanitan-galar", "alcremie"].sort());
});

// --- 19: level ranges ---

test("every encounter has a valid, non-empty minimumLevel/maximumLevel range", () => {
  for (const encounter of allGalarEncounters()) {
    assert.ok(encounter.minimumLevel <= encounter.maximumLevel, `${encounter.pokemonId}: minimumLevel must be <= maximumLevel`);
    assert.ok(encounter.minimumLevel > 0, `${encounter.pokemonId}: minimumLevel must be positive`);
  }
});

test("every encounter weight is a positive number", () => {
  for (const encounter of allGalarEncounters()) {
    assert.ok(encounter.encounterWeight > 0, `${encounter.pokemonId}: encounterWeight must be positive`);
  }
});

// --- 20-21: generic resolver wiring, battle capability ---

test("Galar resolves through the generic region-aware resolver (getZoneData/getZone), never a special case", () => {
  assert.equal(getZoneData("galar").length, 5);
  assert.equal(getZoneData("galar"), GALAR_ZONE_DATA);

  for (const zoneId of ["grassland", "water", "cave", "lava", "haunted-house"] as const) {
    const zone = getZone("galar", zoneId);
    assert.ok(zone, `getZone("galar", "${zoneId}") must resolve`);
    assert.equal(zone!.id, zoneId);
  }
});

test("Galar is now battle-capable because real zone data exists (getZoneData(\"galar\").length > 0)", () => {
  assert.ok(getZoneData("galar").length > 0);
});

// --- 22: region isolation (existing regions unaffected) ---

test("Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, and Alola zone files are unaffected by Galar's addition", () => {
  assert.ok(KANTO_ZONE_DATA.length > 0);
  assert.ok(JOHTO_ZONE_DATA.length > 0);
  assert.ok(HOENN_ZONE_DATA.length > 0);
  assert.ok(SINNOH_ZONE_DATA.length > 0);
  assert.ok(UNOVA_ZONE_DATA.length > 0);
  assert.ok(KALOS_ZONE_DATA.length > 0);
  assert.ok(ALOLA_ZONE_DATA.length > 0);

  // Every earlier six-zone region still has its own Beach zone, untouched —
  // except Kalos and Alola, which (like Galar) are deliberate five-zone
  // regions with no Beach of their own; that's their own pre-existing
  // design, not something this phase changes.
  for (const zoneData of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA]) {
    assert.ok(zoneData.some((zone) => zone.id === "beach"), "earlier six-zone regions must keep their own Beach zone");
  }
  assert.ok(!KALOS_ZONE_DATA.some((zone) => zone.id === "beach"), "Kalos must remain a five-zone region");
  assert.ok(!ALOLA_ZONE_DATA.some((zone) => zone.id === "beach"), "Alola must remain a five-zone region");
});

test("the same zoneId resolves to a completely different pool per region — Galar's own grassland roster never leaks into or from another region", () => {
  const galarGrassland = getZone("galar", "grassland")!;
  const galarIds = new Set(galarGrassland.encounters.map((e) => e.pokemonId));

  for (const otherRegion of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA, KALOS_ZONE_DATA, ALOLA_ZONE_DATA]) {
    const otherGrassland = otherRegion.find((zone) => zone.id === "grassland");
    for (const encounter of otherGrassland!.encounters) {
      assert.ok(!galarIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both another region and Galar grassland`);
    }
  }
});
