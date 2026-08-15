import assert from "node:assert/strict";
import { test } from "node:test";

import { ALOLA_ZONE_DATA } from "./alola-zone-data.ts";
import { GALAR_ZONE_DATA } from "./galar-zone-data.ts";
import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KALOS_ZONE_DATA } from "./kalos-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { PALDEA_ZONE_DATA } from "./paldea-zone-data.ts";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data.ts";
import { UNOVA_ZONE_DATA } from "./unova-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { getEffectiveEncounterRarity } from "../../engine/encounter-rarity/get-effective-encounter-rarity.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Paldea Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required (same shape
// galar-zone-data.test.ts already established), checked directly against
// the canonical species catalog and Forms data rather than a second
// hardcoded species list here.

function allPaldeaEncounters() {
  return PALDEA_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

// The exact approved Paldea internal-id set: 120 base species (#906-#1025,
// formOf undefined) + the 4 approved Paldean Forms. The 3 Tauros breeds
// deliberately SHARE Kanto Tauros's National Dex number (#128), and Paldean
// Wooper shares Johto Wooper's (#194) — so, same as Galar's own Galarian
// Forms, "dexNumber in range" is not a valid region-isolation test here (it
// would incorrectly reject every approved Paldean Form). This is the one
// place that distinction matters; every test below derives membership from
// this explicit id set, never from a dex-number bound.
const PALDEAN_FORM_IDS = ["wooper-paldea", "tauros-paldea-combat", "tauros-paldea-blaze", "tauros-paldea-aqua"];

function paldeaBaseSpeciesIds() {
  return POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 906 && species.dexNumber <= 1025
  ).map((species) => species.id);
}

function approvedPaldeaIdSet() {
  return new Set([...paldeaBaseSpeciesIds(), ...PALDEAN_FORM_IDS]);
}

// --- 1-3: six zones, exact ids, Beach IS present ---

test("Paldea has exactly 6 encounter zones", () => {
  assert.equal(PALDEA_ZONE_DATA.length, 6);
});

test("Paldea zone ids are exactly grassland/water/cave/lava/haunted-house/beach, in that order", () => {
  assert.deepEqual(
    PALDEA_ZONE_DATA.map((zone) => zone.id),
    ["grassland", "water", "cave", "lava", "haunted-house", "beach"]
  );
});

test("Beach IS present in Paldea zone data (Paldea is a deliberate six-zone region, unlike five-zone Kalos/Alola/Galar)", () => {
  const zoneIds = PALDEA_ZONE_DATA.map((zone) => zone.id);
  assert.ok(zoneIds.includes("beach"));
});

// --- 4-6: zone counts, total, uniqueness ---

test("zone counts match the approved distribution exactly (30/12/19/21/25/17)", () => {
  const counts = Object.fromEntries(PALDEA_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 30,
    water: 12,
    cave: 19,
    lava: 21,
    "haunted-house": 25,
    beach: 17,
  });
});

test("Paldea contains exactly 124 encounter entries", () => {
  assert.equal(allPaldeaEncounters().length, 124);
});

test("there are exactly 124 unique species ids across all Paldea zones", () => {
  const ids = new Set(allPaldeaEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 124);
});

// --- 7-9: base species + Forms coverage ---

test("every official Paldea base species (#906-#1025) appears exactly once", () => {
  const baseIds = paldeaBaseSpeciesIds();
  assert.equal(baseIds.length, 120, "test assumption: 120 official Paldea base species exist");

  const encounterIds = allPaldeaEncounters().map((encounter) => encounter.pokemonId);
  const missing = baseIds.filter((id) => !encounterIds.includes(id));
  assert.deepEqual(missing, [], "no Paldea base species may be missing from the encounter tables");

  for (const id of baseIds) {
    assert.equal(encounterIds.filter((candidate) => candidate === id).length, 1, `${id} must appear exactly once`);
  }
});

test("all 4 approved Paldean Forms appear exactly once", () => {
  const ids = allPaldeaEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(PALDEAN_FORM_IDS.length, 4, "test assumption: 4 approved Paldean Forms");
  for (const id of PALDEAN_FORM_IDS) {
    assert.equal(ids.filter((candidate) => candidate === id).length, 1, `${id} must appear exactly once`);
  }
});

// --- 10-11: no duplicates, no unknown ids ---

test("no duplicate species ids across all Paldea zones", () => {
  const ids = allPaldeaEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every referenced Paldea species id resolves in the canonical species catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = allPaldeaEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("no unapproved Form appears — the Paldea encounter table equals the approved internal-id set exactly", () => {
  // Region isolation, done correctly: Paldean Forms share their Kanto/Johto
  // base's dexNumber, so a naive "dexNumber >= 906" check would wrongly
  // reject every one of them. Instead this asserts the encounter table's id
  // set is EXACTLY the approved set (120 base + 4 Forms), catching both an
  // unapproved addition and a missing approved entry.
  const encounterIds = new Set(allPaldeaEncounters().map((encounter) => encounter.pokemonId));
  const approved = approvedPaldeaIdSet();
  assert.equal(approved.size, 124, "test assumption: 124 approved Paldea internal ids");
  assert.deepEqual([...encounterIds].sort(), [...approved].sort());
});

test("no earlier-region species id (Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos/Alola/Galar's own encounter pools) appears in the Paldea pools", () => {
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...UNOVA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...KALOS_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...ALOLA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...GALAR_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  const overlap = allPaldeaEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => otherRegionIds.has(id));
  assert.deepEqual(overlap, []);
});

test("every zone contains at least one valid encounter", () => {
  for (const zone of PALDEA_ZONE_DATA) {
    assert.ok(zone.encounters.length > 0, `${zone.id} must have at least one encounter`);
  }
});

// --- 12: approved zone-membership locking ---
//
// Locks the EXACT approved species membership per zone (not merely the
// counts) so a future refactor can never silently move a Pokémon between
// Paldea zones while the totals still add up. The membership below is
// copied verbatim from the Paldea Phase 6 approved distribution.
const APPROVED_MEMBERSHIP: Record<string, string[]> = {
  grassland: [
    "sprigatito", "floragato", "meowscarada", "lechonk", "oinkologne", "tarountula", "spidops", "nymble",
    "lokix", "pawmi", "pawmo", "pawmot", "tandemaus", "maushold", "smoliv", "dolliv", "arboliva",
    "squawkabilly", "capsakid", "rellor", "farigiraf", "dudunsparce",
    "tauros-paldea-combat", "ogerpon", "iron-leaves", "dipplin", "hydrapple", "terapagos", "sandy-shocks",
    "raging-bolt",
  ],
  water: [
    "quaxly", "quaxwell", "quaquaval", "wiglett", "wugtrio", "finizen", "palafin", "veluza", "dondozo",
    "walking-wake", "tauros-paldea-aqua", "tatsugiri",
  ],
  cave: [
    "nacli", "naclstack", "garganacl", "maschiff", "mabosstiff", "glimmet", "glimmora", "great-tusk",
    "iron-treads", "iron-hands", "iron-thorns", "iron-valiant", "ting-lu", "iron-boulder", "iron-crown",
    "kingambit", "archaludon", "tadbulb", "bellibolt",
  ],
  lava: [
    "fuecoco", "crocalor", "skeledirge", "charcadet", "armarouge", "varoom", "revavroom", "slither-wing",
    "chi-yu", "koraidon", "gouging-fire", "iron-moth", "tauros-paldea-blaze", "frigibax", "arctibax",
    "baxcalibur", "roaring-moon", "scovillain", "orthworm", "shroodle", "grafaiai",
  ],
  "haunted-house": [
    "ceruledge", "greavard", "houndstone", "scream-tail", "brute-bonnet", "flutter-mane", "wo-chien",
    "munkidori", "pecharunt", "annihilape", "iron-jugulis", "poltchageist", "sinistcha", "fidough",
    "dachsbun", "bramblin", "brambleghast", "rabsca", "flittle", "espathra", "tinkatink", "tinkatuff",
    "tinkaton", "gimmighoul", "gholdengo",
  ],
  beach: [
    "wattrel", "kilowattrel", "bombirdier", "cetoddle", "cetitan", "miraidon", "okidogi", "toedscool",
    "toedscruel", "cyclizar", "flamigo", "iron-bundle", "wooper-paldea", "clodsire", "klawf", "chien-pao",
    "fezandipiti",
  ],
};

test("the approved zone membership (Paldea Phase 6 spec) is preserved EXACTLY, in the approved order, per zone", () => {
  for (const zone of PALDEA_ZONE_DATA) {
    const actualIds = zone.encounters.map((e) => e.pokemonId);
    const approvedIds = APPROVED_MEMBERSHIP[zone.id];
    assert.ok(approvedIds, `test assumption: an approved membership list must exist for ${zone.id}`);
    assert.deepEqual(actualIds, approvedIds, `${zone.id}'s exact species membership/order must match the Paldea Phase 6 approved list`);
  }
});

// --- 13-18: rarity / effective rarity / weights ---

test("the three Paldea evolution-item targets resolve to effective very-rare while their real PokemonSpecies.rarity is unchanged", () => {
  const itemEvolutionTargets = ["bellibolt", "scovillain", "cetitan"];
  for (const id of itemEvolutionTargets) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `${id}'s real PokemonSpecies.rarity must stay "rare"`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id}'s effective encounter rarity must be "very-rare"`);
  }
});

test("Paldea's three starter lines and its own Frigibax/Arctibax/Baxcalibur pseudo-legendary line are real very-rare and resolve to effective very-rare", () => {
  for (const id of [
    "sprigatito", "floragato", "meowscarada",
    "fuecoco", "crocalor", "skeledirge",
    "quaxly", "quaxwell", "quaquaval",
    "frigibax", "arctibax", "baxcalibur",
  ]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be real rarity "very-rare"`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id} must resolve to effective "very-rare"`);
  }
});

// REVISED by the PALDEA PHASE 7 RARITY AUDIT approved-design-change: 19
// species moved to real "very-rare" (14 Paradox species from "legendary",
// Armarouge/Ceruledge/Annihilape/Archaludon from "rare", and Charcadet
// from "common") — so Paldea's real very-rare set grew from the original
// 12 (starters + pseudo-legendary line) to 31.
test("Paldea's REAL very-rare set (within the encounter table) is exactly these 31 species, no more and no fewer", () => {
  const veryRareIds = POKEMON_DATA.filter((species) => {
    if (species.rarity !== "very-rare") return false;
    const encounterIds = allPaldeaEncounters().map((e) => e.pokemonId);
    return encounterIds.includes(species.id);
  })
    .map((species) => species.id)
    .sort();

  assert.deepEqual(
    veryRareIds,
    [
      "sprigatito", "floragato", "meowscarada",
      "fuecoco", "crocalor", "skeledirge",
      "quaxly", "quaxwell", "quaquaval",
      "frigibax", "arctibax", "baxcalibur",
      "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane", "slither-wing", "sandy-shocks",
      "iron-treads", "iron-bundle", "iron-hands", "iron-jugulis", "iron-moth", "iron-thorns",
      "roaring-moon", "iron-valiant",
      "armarouge", "ceruledge", "annihilape", "archaludon",
      "charcadet",
    ].sort()
  );
});

// REVISED by the PALDEA PHASE 7 RARITY AUDIT: 14 Paradox species moved out
// of the legendary tier (see above), leaving exactly 18 real-legendary
// Paldea entries.
test("all 18 remaining Paldea legendary internal entries are real legendary and resolve to effective legendary, using encounterWeight 1", () => {
  const legendaryIds = [
    "wo-chien", "chien-pao", "ting-lu", "chi-yu",
    "koraidon", "miraidon", "walking-wake", "iron-leaves",
    "okidogi", "munkidori", "fezandipiti", "ogerpon",
    "gouging-fire", "raging-bolt", "iron-boulder", "iron-crown", "terapagos", "pecharunt",
  ];
  assert.equal(legendaryIds.length, 18, "test assumption: 18 Paldea legendary entries post-audit");
  const encountersById = new Map(allPaldeaEncounters().map((e) => [e.pokemonId, e]));
  for (const id of legendaryIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "legendary");
    assert.equal(getEffectiveEncounterRarity(id), "legendary");
    assert.equal(encountersById.get(id)?.encounterWeight, 1, `${id} must use encounterWeight 1`);
  }
});

test("the 19 PALDEA PHASE 7 RARITY AUDIT reclassifications now use the very-rare weight/level band (5, 6-10)", () => {
  const auditedIds = [
    "great-tusk", "scream-tail", "brute-bonnet", "flutter-mane", "slither-wing", "sandy-shocks",
    "iron-treads", "iron-bundle", "iron-hands", "iron-jugulis", "iron-moth", "iron-thorns",
    "roaring-moon", "iron-valiant",
    "armarouge", "ceruledge", "annihilape", "archaludon",
    "charcadet",
  ];
  assert.equal(auditedIds.length, 19);
  const encountersById = new Map(allPaldeaEncounters().map((e) => [e.pokemonId, e]));
  for (const id of auditedIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be real rarity "very-rare" post-audit`);
    const encounter = encountersById.get(id);
    assert.equal(encounter?.encounterWeight, 5, `${id} must use encounterWeight 5`);
    assert.equal(encounter?.minimumLevel, 6, `${id} must use minimumLevel 6`);
    assert.equal(encounter?.maximumLevel, 10, `${id} must use maximumLevel 10`);
  }
});

test("every effective very-rare encounter uses the established Very Rare weight (5)", () => {
  for (const encounter of allPaldeaEncounters()) {
    if (getEffectiveEncounterRarity(encounter.pokemonId) === "very-rare") {
      assert.equal(encounter.encounterWeight, 5, `${encounter.pokemonId} (effective very-rare) must use encounterWeight 5`);
    }
  }
});

test("every common encounter (real AND effective common) uses the established Common weight (20)", () => {
  for (const encounter of allPaldeaEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    if (species.rarity === "common" && getEffectiveEncounterRarity(encounter.pokemonId) === "common") {
      assert.equal(encounter.encounterWeight, 20, `${encounter.pokemonId} (common) must use encounterWeight 20`);
    }
  }
});

// Archaludon moved to very-rare in the PALDEA PHASE 7 RARITY AUDIT (see
// above) and is no longer part of this standalone-rare set.
test("every standalone rare encounter (real rare, not an evolution target of any kind) uses the established Rare weight (10)", () => {
  const standaloneRareIds = [
    "squawkabilly", "klawf", "bombirdier", "cyclizar", "orthworm", "flamigo", "veluza", "dondozo",
    "tatsugiri", "tauros-paldea-combat", "tauros-paldea-blaze", "tauros-paldea-aqua",
  ];
  const encountersById = new Map(allPaldeaEncounters().map((e) => [e.pokemonId, e]));
  for (const id of standaloneRareIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `test assumption: ${id} is real rarity rare`);
    assert.equal(getEffectiveEncounterRarity(id), "rare", `test assumption: ${id} is not an evolution-item target`);
    assert.equal(encountersById.get(id)?.encounterWeight, 10, `${id} (standalone rare) must use encounterWeight 10`);
  }
});

// Armarouge, Ceruledge, and Annihilape moved to very-rare in the PALDEA
// PHASE 7 RARITY AUDIT (see above) and are no longer part of this
// rare-evolution-target set — though their weight/level (5, 6-10) is
// numerically identical either way, since that's the same band this
// bucket already used.
test("every remaining real-rare encounter that IS a level/branch-evolution target uses weight 5, matching the established convention", () => {
  const evolutionTargetRareIds = [
    "oinkologne", "spidops", "lokix", "pawmot", "maushold", "dachsbun", "arboliva", "garganacl",
    "kilowattrel", "mabosstiff", "grafaiai", "brambleghast", "toedscruel",
    "rabsca", "espathra", "tinkaton", "wugtrio", "palafin", "revavroom", "glimmora", "houndstone",
    "gholdengo", "sinistcha", "hydrapple", "clodsire", "farigiraf", "dudunsparce", "kingambit",
  ];
  const encountersById = new Map(allPaldeaEncounters().map((e) => [e.pokemonId, e]));
  for (const id of evolutionTargetRareIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `test assumption: ${id} is real rarity rare`);
    assert.equal(encountersById.get(id)?.encounterWeight, 5, `${id} (rare evolution target) must use encounterWeight 5`);
  }
});

test("real rarity totals across the 124 Paldea entries are common 32 / rare 43 / very-rare 31 / legendary 18 (post PALDEA PHASE 7 RARITY AUDIT)", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allPaldeaEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    counts[species.rarity]++;
  }
  assert.deepEqual(counts, { common: 32, rare: 43, "very-rare": 31, legendary: 18 });
});

test("effective rarity totals across the 124 Paldea entries are common 32 / rare 40 / very-rare 34 / legendary 18 (post PALDEA PHASE 7 RARITY AUDIT)", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allPaldeaEncounters()) {
    counts[getEffectiveEncounterRarity(encounter.pokemonId)!]++;
  }
  assert.deepEqual(counts, { common: 32, rare: 40, "very-rare": 34, legendary: 18 });
});

test("the real -> effective rarity difference set is exactly the three evolution-item targets, no more and no fewer", () => {
  const diffs = [...approvedPaldeaIdSet()]
    .filter((id) => {
      const species = POKEMON_DATA.find((candidate) => candidate.id === id)!;
      return getEffectiveEncounterRarity(id) !== species.rarity;
    })
    .sort();

  assert.deepEqual(diffs, ["bellibolt", "scovillain", "cetitan"].sort());
});

// --- 19: level ranges ---

test("every encounter has a valid, non-empty minimumLevel/maximumLevel range", () => {
  for (const encounter of allPaldeaEncounters()) {
    assert.ok(encounter.minimumLevel <= encounter.maximumLevel, `${encounter.pokemonId}: minimumLevel must be <= maximumLevel`);
    assert.ok(encounter.minimumLevel > 0, `${encounter.pokemonId}: minimumLevel must be positive`);
  }
});

test("every encounter weight is a positive number", () => {
  for (const encounter of allPaldeaEncounters()) {
    assert.ok(encounter.encounterWeight > 0, `${encounter.pokemonId}: encounterWeight must be positive`);
  }
});

// --- 20-21: generic resolver wiring, battle capability ---

test("Paldea resolves through the generic region-aware resolver (getZoneData/getZone), never a special case", () => {
  assert.equal(getZoneData("paldea").length, 6);
  assert.equal(getZoneData("paldea"), PALDEA_ZONE_DATA);

  for (const zoneId of ["grassland", "water", "cave", "lava", "haunted-house", "beach"] as const) {
    const zone = getZone("paldea", zoneId);
    assert.ok(zone, `getZone("paldea", "${zoneId}") must resolve`);
    assert.equal(zone!.id, zoneId);
  }
});

test('Paldea is now battle-capable because real zone data exists (getZoneData("paldea").length > 0)', () => {
  assert.ok(getZoneData("paldea").length > 0);
});

// --- 22: region isolation (existing regions unaffected) ---

test("Kanto, Johto, Hoenn, Sinnoh, Unova, Kalos, Alola, and Galar zone files are unaffected by Paldea's addition", () => {
  assert.ok(KANTO_ZONE_DATA.length > 0);
  assert.ok(JOHTO_ZONE_DATA.length > 0);
  assert.ok(HOENN_ZONE_DATA.length > 0);
  assert.ok(SINNOH_ZONE_DATA.length > 0);
  assert.ok(UNOVA_ZONE_DATA.length > 0);
  assert.ok(KALOS_ZONE_DATA.length > 0);
  assert.ok(ALOLA_ZONE_DATA.length > 0);
  assert.ok(GALAR_ZONE_DATA.length > 0);

  // Every earlier six-zone region still has its own Beach zone, untouched —
  // except Kalos, Alola, and Galar, which are deliberate five-zone regions
  // with no Beach of their own; that's their own pre-existing design, not
  // something this phase changes.
  for (const zoneData of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA]) {
    assert.ok(zoneData.some((zone) => zone.id === "beach"), "earlier six-zone regions must keep their own Beach zone");
  }
  assert.ok(!KALOS_ZONE_DATA.some((zone) => zone.id === "beach"), "Kalos must remain a five-zone region");
  assert.ok(!ALOLA_ZONE_DATA.some((zone) => zone.id === "beach"), "Alola must remain a five-zone region");
  assert.ok(!GALAR_ZONE_DATA.some((zone) => zone.id === "beach"), "Galar must remain a five-zone region");
});

test("the same zoneId resolves to a completely different pool per region — Paldea's own grassland roster never leaks into or from another region", () => {
  const paldeaGrassland = getZone("paldea", "grassland")!;
  const paldeaIds = new Set(paldeaGrassland.encounters.map((e) => e.pokemonId));

  for (const otherRegion of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA, KALOS_ZONE_DATA, ALOLA_ZONE_DATA, GALAR_ZONE_DATA]) {
    const otherGrassland = otherRegion.find((zone) => zone.id === "grassland");
    for (const encounter of otherGrassland!.encounters) {
      assert.ok(!paldeaIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both another region and Paldea grassland`);
    }
  }
});
