import assert from "node:assert/strict";
import { test } from "node:test";

import { ALOLA_ZONE_DATA } from "./alola-zone-data.ts";
import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KALOS_ZONE_DATA } from "./kalos-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data.ts";
import { UNOVA_ZONE_DATA } from "./unova-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { getEffectiveEncounterRarity } from "../../engine/encounter-rarity/get-effective-encounter-rarity.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Alola Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required, checked
// directly against the canonical species catalog and Forms data rather
// than a second hardcoded species list here.

function allAlolaEncounters() {
  return ALOLA_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

// The exact approved Alola internal-id set: 88 base species (#722-#809,
// formOf undefined) + the 18 approved Alolan Forms + the 2 extra Lycanroc
// Forms. Alolan Forms deliberately SHARE their Kanto base's National Dex
// number (e.g. raichu-alola is dex #26, same as Kanto raichu) — so, unlike
// every earlier region, "dexNumber in range" is not a valid region-isolation
// test here (it would incorrectly reject every approved Alolan Form). This
// is the one place that distinction matters; every test below derives
// membership from this explicit id set, never from a dex-number bound.
const ALOLAN_FORM_IDS = [
  "rattata-alola", "raticate-alola", "raichu-alola", "sandshrew-alola", "sandslash-alola",
  "vulpix-alola", "ninetales-alola", "diglett-alola", "dugtrio-alola", "meowth-alola",
  "persian-alola", "geodude-alola", "graveler-alola", "golem-alola", "grimer-alola",
  "muk-alola", "exeggutor-alola", "marowak-alola",
];
const EXTRA_LYCANROC_FORM_IDS = ["lycanroc-midnight", "lycanroc-dusk"];

function alolaBaseSpeciesIds() {
  return POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 722 && species.dexNumber <= 809
  ).map((species) => species.id);
}

function approvedAlolaIdSet() {
  return new Set([...alolaBaseSpeciesIds(), ...ALOLAN_FORM_IDS, ...EXTRA_LYCANROC_FORM_IDS]);
}

// --- 1-3: five zones, exact ids, no beach ---

test("Alola has exactly 5 encounter zones", () => {
  assert.equal(ALOLA_ZONE_DATA.length, 5);
});

test("Alola zone ids are exactly grassland/water/cave/lava/haunted-house, in that order", () => {
  assert.deepEqual(
    ALOLA_ZONE_DATA.map((zone) => zone.id),
    ["grassland", "water", "cave", "lava", "haunted-house"]
  );
});

test("Beach is absent from Alola zone data (Alola is a deliberate five-zone region)", () => {
  const zoneIds = ALOLA_ZONE_DATA.map((zone) => zone.id);
  assert.ok(!zoneIds.includes("beach" as (typeof zoneIds)[number]));
});

// --- 4-6: zone counts, total, uniqueness ---

test("zone counts match the approved distribution exactly (44/19/18/14/13)", () => {
  const counts = Object.fromEntries(ALOLA_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 44,
    water: 19,
    cave: 18,
    lava: 14,
    "haunted-house": 13,
  });
});

test("Alola contains exactly 108 encounter entries", () => {
  assert.equal(allAlolaEncounters().length, 108);
});

test("there are exactly 108 unique species ids across all Alola zones", () => {
  const ids = new Set(allAlolaEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 108);
});

// --- 7-9: base species + Forms coverage ---

test("every official Alola base species (#722-#809) appears exactly once", () => {
  const baseIds = alolaBaseSpeciesIds();
  assert.equal(baseIds.length, 88, "test assumption: 88 official Alola base species exist");

  const encounterIds = allAlolaEncounters().map((encounter) => encounter.pokemonId);
  const missing = baseIds.filter((id) => !encounterIds.includes(id));
  assert.deepEqual(missing, [], "no Alola base species may be missing from the encounter tables");

  for (const id of baseIds) {
    assert.equal(encounterIds.filter((candidate) => candidate === id).length, 1, `${id} must appear exactly once`);
  }
});

test("all 18 approved Alolan Forms appear exactly once", () => {
  const ids = allAlolaEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(ALOLAN_FORM_IDS.length, 18, "test assumption: 18 approved Alolan Forms");
  for (const id of ALOLAN_FORM_IDS) {
    assert.equal(ids.filter((candidate) => candidate === id).length, 1, `${id} must appear exactly once`);
  }
});

test("both extra Lycanroc Forms (Midnight, Dusk) appear exactly once, alongside base Lycanroc", () => {
  const ids = allAlolaEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(ids.filter((id) => id === "lycanroc").length, 1);
  assert.equal(ids.filter((id) => id === "lycanroc-midnight").length, 1);
  assert.equal(ids.filter((id) => id === "lycanroc-dusk").length, 1);
});

// --- 10-11: no duplicates, no unknown ids ---

test("no duplicate species ids across all Alola zones", () => {
  const ids = allAlolaEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every referenced Alola species id resolves in the canonical species catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = allAlolaEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("no unapproved Form appears — the Alola encounter table equals the approved internal-id set exactly", () => {
  // Region isolation, done correctly: Alolan Forms share their Kanto base's
  // dexNumber, so a naive "dexNumber >= 722" check would wrongly reject
  // every one of them. Instead this asserts the encounter table's id set is
  // EXACTLY the approved set (88 base + 18 Forms + 2 extra Lycanroc Forms),
  // catching both an unapproved addition and a missing approved entry.
  const encounterIds = new Set(allAlolaEncounters().map((encounter) => encounter.pokemonId));
  const approved = approvedAlolaIdSet();
  assert.equal(approved.size, 108, "test assumption: 108 approved Alola internal ids");
  assert.deepEqual([...encounterIds].sort(), [...approved].sort());
});

test("no earlier-region species id (Kanto/Johto/Hoenn/Sinnoh/Unova/Kalos's own encounter pools) appears in the Alola pools", () => {
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...UNOVA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...KALOS_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  const overlap = allAlolaEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => otherRegionIds.has(id));
  assert.deepEqual(overlap, []);
});

test("every zone contains at least one valid encounter", () => {
  for (const zone of ALOLA_ZONE_DATA) {
    assert.ok(zone.encounters.length > 0, `${zone.id} must have at least one encounter`);
  }
});

// --- 12-25: approved placements ---

test("Rockruff is in Lava", () => {
  const lava = ALOLA_ZONE_DATA.find((zone) => zone.id === "lava")!;
  assert.ok(lava.encounters.some((e) => e.pokemonId === "rockruff"));
});

test("all 3 Lycanroc entries (base/Midnight/Dusk) are in Lava", () => {
  const lava = ALOLA_ZONE_DATA.find((zone) => zone.id === "lava")!;
  const ids = lava.encounters.map((e) => e.pokemonId);
  assert.ok(ids.includes("lycanroc"));
  assert.ok(ids.includes("lycanroc-midnight"));
  assert.ok(ids.includes("lycanroc-dusk"));
});

test("Alolan Raichu is in Grassland", () => {
  const grassland = ALOLA_ZONE_DATA.find((zone) => zone.id === "grassland")!;
  assert.ok(grassland.encounters.some((e) => e.pokemonId === "raichu-alola"));
});

test("Alolan Vulpix and Alolan Ninetales are in Water", () => {
  const water = ALOLA_ZONE_DATA.find((zone) => zone.id === "water")!;
  const ids = water.encounters.map((e) => e.pokemonId);
  assert.ok(ids.includes("vulpix-alola"));
  assert.ok(ids.includes("ninetales-alola"));
});

test("Alolan Sandshrew and Alolan Sandslash are in Cave", () => {
  const cave = ALOLA_ZONE_DATA.find((zone) => zone.id === "cave")!;
  const ids = cave.encounters.map((e) => e.pokemonId);
  assert.ok(ids.includes("sandshrew-alola"));
  assert.ok(ids.includes("sandslash-alola"));
});

test("Alolan Exeggutor is in Grassland", () => {
  const grassland = ALOLA_ZONE_DATA.find((zone) => zone.id === "grassland")!;
  assert.ok(grassland.encounters.some((e) => e.pokemonId === "exeggutor-alola"));
});

test("Alolan Marowak is in Haunted House", () => {
  const hauntedHouse = ALOLA_ZONE_DATA.find((zone) => zone.id === "haunted-house")!;
  assert.ok(hauntedHouse.encounters.some((e) => e.pokemonId === "marowak-alola"));
});

test("Tapu Koko and Tapu Bulu are in Grassland", () => {
  const grassland = ALOLA_ZONE_DATA.find((zone) => zone.id === "grassland")!;
  const ids = grassland.encounters.map((e) => e.pokemonId);
  assert.ok(ids.includes("tapu-koko"));
  assert.ok(ids.includes("tapu-bulu"));
});

test("Tapu Fini is in Water", () => {
  const water = ALOLA_ZONE_DATA.find((zone) => zone.id === "water")!;
  assert.ok(water.encounters.some((e) => e.pokemonId === "tapu-fini"));
});

test("Tapu Lele is in Haunted House", () => {
  const hauntedHouse = ALOLA_ZONE_DATA.find((zone) => zone.id === "haunted-house")!;
  assert.ok(hauntedHouse.encounters.some((e) => e.pokemonId === "tapu-lele"));
});

test("Solgaleo, Lunala, and Necrozma are in Haunted House", () => {
  const hauntedHouse = ALOLA_ZONE_DATA.find((zone) => zone.id === "haunted-house")!;
  const ids = hauntedHouse.encounters.map((e) => e.pokemonId);
  assert.ok(ids.includes("solgaleo"));
  assert.ok(ids.includes("lunala"));
  assert.ok(ids.includes("necrozma"));
});

test("Magearna and Blacephalon are in Lava", () => {
  const lava = ALOLA_ZONE_DATA.find((zone) => zone.id === "lava")!;
  const ids = lava.encounters.map((e) => e.pokemonId);
  assert.ok(ids.includes("magearna"));
  assert.ok(ids.includes("blacephalon"));
});

// --- 26-31: rarity / effective rarity / weights ---

test("the four Alola evolution-item targets resolve to effective very-rare while their real PokemonSpecies.rarity is unchanged", () => {
  const itemEvolutionTargets: Record<string, "rare" | "common"> = {
    vikavolt: "rare",
    "sandslash-alola": "common",
    "ninetales-alola": "rare",
    "exeggutor-alola": "common",
  };
  for (const [id, expectedRealRarity] of Object.entries(itemEvolutionTargets)) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, expectedRealRarity, `${id}'s real PokemonSpecies.rarity must stay "${expectedRealRarity}"`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id}'s effective encounter rarity must be "very-rare"`);
  }
});

test("Alolan Raichu is real very-rare and is also an item-evolution target, with no observable effective-rarity change", () => {
  const species = POKEMON_DATA.find((candidate) => candidate.id === "raichu-alola")!;
  assert.equal(species.rarity, "very-rare");
  assert.equal(getEffectiveEncounterRarity("raichu-alola"), "very-rare");
});

test("Alolan Marowak is a BRANCH_EVOLUTIONS target (not an item evolution) and is real very-rare per the Alola Rarity Audit, independent of the generic item-evolution system", () => {
  const species = POKEMON_DATA.find((candidate) => candidate.id === "marowak-alola")!;
  assert.equal(species.rarity, "very-rare");
  assert.equal(getEffectiveEncounterRarity("marowak-alola"), "very-rare");
});

test("Alola's three starter lines, the Jangmo-o pseudo-legendary line, and (per the Alola Rarity Audit) Alolan Golem are real very-rare and resolve to effective very-rare", () => {
  for (const id of [
    "rowlet", "dartrix", "decidueye",
    "litten", "torracat", "incineroar",
    "popplio", "brionne", "primarina",
    "jangmo-o", "hakamo-o", "kommo-o",
    "golem-alola",
  ]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be real rarity "very-rare"`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id} must resolve to effective "very-rare"`);
  }
});

test("the Alola Rarity Audit's approved REAL very-rare set is exactly these 15 species, no more and no fewer", () => {
  const veryRareIds = POKEMON_DATA.filter((species) => {
    if (species.rarity !== "very-rare") return false;
    const encounterIds = allAlolaEncounters().map((e) => e.pokemonId);
    return encounterIds.includes(species.id);
  })
    .map((species) => species.id)
    .sort();

  assert.deepEqual(
    veryRareIds,
    [
      "rowlet", "dartrix", "decidueye",
      "litten", "torracat", "incineroar",
      "popplio", "brionne", "primarina",
      "jangmo-o", "hakamo-o", "kommo-o",
      "raichu-alola", "golem-alola", "marowak-alola",
    ].sort()
  );
});

test("all 25 Alola legendary internal entries are real legendary and resolve to effective legendary, using encounterWeight 1", () => {
  const legendaryIds = [
    "tapu-koko", "tapu-bulu", "tapu-fini", "tapu-lele",
    "buzzwole", "pheromosa", "xurkitree", "kartana", "poipole", "naganadel", "zeraora",
    "celesteela", "stakataka", "meltan", "melmetal",
    "magearna", "blacephalon",
    "cosmog", "cosmoem", "solgaleo", "lunala", "nihilego", "guzzlord", "necrozma", "marshadow",
  ];
  assert.equal(legendaryIds.length, 25, "test assumption: 25 Alola legendary entries");
  const encountersById = new Map(allAlolaEncounters().map((e) => [e.pokemonId, e]));
  for (const id of legendaryIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "legendary");
    assert.equal(getEffectiveEncounterRarity(id), "legendary");
    assert.equal(encountersById.get(id)?.encounterWeight, 1, `${id} must use encounterWeight 1`);
  }
});

test("every effective very-rare encounter uses the established Very Rare weight (5)", () => {
  for (const encounter of allAlolaEncounters()) {
    if (getEffectiveEncounterRarity(encounter.pokemonId) === "very-rare") {
      assert.equal(encounter.encounterWeight, 5, `${encounter.pokemonId} (effective very-rare) must use encounterWeight 5`);
    }
  }
});

test("every common encounter (real AND effective common — excluding the two common-rarity evolution-item targets) uses the established Common weight (20)", () => {
  for (const encounter of allAlolaEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    if (species.rarity === "common" && getEffectiveEncounterRarity(encounter.pokemonId) === "common") {
      assert.equal(encounter.encounterWeight, 20, `${encounter.pokemonId} (common) must use encounterWeight 20`);
    }
  }
});

test("every standalone rare encounter (real rare, not an evolution target of any kind) uses the established Rare weight (10)", () => {
  const standaloneRareIds = [
    "crabrawler", "salandit", "passimian", "bruxish",
    "minior", "komala", "turtonator", "oricorio", "drampa",
    "oranguru", "mimikyu", "dhelmise",
  ];
  const encountersById = new Map(allAlolaEncounters().map((e) => [e.pokemonId, e]));
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
    "trumbeak", "toucannon", "gumshoos", "ribombee", "lurantis", "tsareena", "silvally",
    "crabominable", "toxapex", "araquanid", "golisopod", "palossand", "mudsdale", "salazzle",
    "raticate-alola", "muk-alola",
    "lycanroc", "lycanroc-midnight", "lycanroc-dusk",
  ];
  const encountersById = new Map(allAlolaEncounters().map((e) => [e.pokemonId, e]));
  for (const id of evolutionTargetRareIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `test assumption: ${id} is real rarity rare`);
    assert.equal(encountersById.get(id)?.encounterWeight, 5, `${id} (rare evolution target) must use encounterWeight 5`);
  }
});

test("real rarity totals across the 108 Alola entries are common 35 / rare 33 / very-rare 15 / legendary 25 (post Alola Rarity Audit)", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allAlolaEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    counts[species.rarity]++;
  }
  assert.deepEqual(counts, { common: 35, rare: 33, "very-rare": 15, legendary: 25 });
});

test("effective rarity totals across the 108 Alola entries are common 33 / rare 31 / very-rare 19 / legendary 25 (post Alola Rarity Audit)", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allAlolaEncounters()) {
    counts[getEffectiveEncounterRarity(encounter.pokemonId)!]++;
  }
  assert.deepEqual(counts, { common: 33, rare: 31, "very-rare": 19, legendary: 25 });
});

test("the real -> effective rarity difference set is exactly the four evolution-item targets, no more and no fewer", () => {
  const diffs = [...approvedAlolaIdSet()]
    .filter((id) => {
      const species = POKEMON_DATA.find((candidate) => candidate.id === id)!;
      return getEffectiveEncounterRarity(id) !== species.rarity;
    })
    .sort();

  assert.deepEqual(diffs, ["vikavolt", "sandslash-alola", "ninetales-alola", "exeggutor-alola"].sort());
});

// --- 32: level ranges ---

test("every encounter has a valid, non-empty minimumLevel/maximumLevel range", () => {
  for (const encounter of allAlolaEncounters()) {
    assert.ok(encounter.minimumLevel <= encounter.maximumLevel, `${encounter.pokemonId}: minimumLevel must be <= maximumLevel`);
    assert.ok(encounter.minimumLevel > 0, `${encounter.pokemonId}: minimumLevel must be positive`);
  }
});

// --- 33-34: generic resolver wiring, battle capability ---

test("Alola resolves through the generic region-aware resolver (getZoneData/getZone), never a special case", () => {
  assert.equal(getZoneData("alola").length, 5);
  assert.equal(getZoneData("alola"), ALOLA_ZONE_DATA);

  for (const zoneId of ["grassland", "water", "cave", "lava", "haunted-house"] as const) {
    const zone = getZone("alola", zoneId);
    assert.ok(zone, `getZone("alola", "${zoneId}") must resolve`);
    assert.equal(zone!.id, zoneId);
  }
});

test("Alola is now battle-capable because real zone data exists (getZoneData(\"alola\").length > 0)", () => {
  assert.ok(getZoneData("alola").length > 0);
});

// --- 35: region isolation (existing regions unaffected) ---

test("Kanto, Johto, Hoenn, Sinnoh, Unova, and Kalos zone files are unaffected by Alola's addition", () => {
  assert.ok(KANTO_ZONE_DATA.length > 0);
  assert.ok(JOHTO_ZONE_DATA.length > 0);
  assert.ok(HOENN_ZONE_DATA.length > 0);
  assert.ok(SINNOH_ZONE_DATA.length > 0);
  assert.ok(UNOVA_ZONE_DATA.length > 0);
  assert.ok(KALOS_ZONE_DATA.length > 0);

  // Every earlier region still has its own Beach zone, untouched — except
  // Kalos, which (like Alola) is a deliberate five-zone region with no
  // Beach of its own; that's Kalos's own pre-existing design, not something
  // this phase changes.
  for (const zoneData of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA]) {
    assert.ok(zoneData.some((zone) => zone.id === "beach"), "earlier six-zone regions must keep their own Beach zone");
  }
  assert.ok(!KALOS_ZONE_DATA.some((zone) => zone.id === "beach"), "Kalos must remain a five-zone region");
});

test("the same zoneId resolves to a completely different pool per region — Alola's own grassland roster never leaks into or from another region", () => {
  const alolaGrassland = getZone("alola", "grassland")!;
  const alolaIds = new Set(alolaGrassland.encounters.map((e) => e.pokemonId));

  for (const otherRegion of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA, KALOS_ZONE_DATA]) {
    const otherGrassland = otherRegion.find((zone) => zone.id === "grassland");
    for (const encounter of otherGrassland!.encounters) {
      assert.ok(!alolaIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both another region and Alola grassland`);
    }
  }
});
