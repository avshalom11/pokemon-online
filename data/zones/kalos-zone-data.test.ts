import assert from "node:assert/strict";
import { test } from "node:test";

import { HOENN_ZONE_DATA } from "./hoenn-zone-data.ts";
import { JOHTO_ZONE_DATA } from "./johto-zone-data.ts";
import { KALOS_ZONE_DATA } from "./kalos-zone-data.ts";
import { KANTO_ZONE_DATA } from "./kanto-zone-data.ts";
import { SINNOH_ZONE_DATA } from "./sinnoh-zone-data.ts";
import { UNOVA_ZONE_DATA } from "./unova-zone-data.ts";
import { getZone, getZoneData } from "./zone-data.ts";
import { getEffectiveEncounterRarity } from "../../engine/encounter-rarity/get-effective-encounter-rarity.ts";
import { POKEMON_DATA } from "../pokemon/pokemon-data.ts";

// Focused regression tests for the Kalos Encounter Tables phase — mirrors
// the validation checklist that phase's own spec required, checked
// directly against the canonical species catalog and Forms data rather
// than a second hardcoded species list here.

function allKalosEncounters() {
  return KALOS_ZONE_DATA.flatMap((zone) => zone.encounters.map((encounter) => ({ zoneId: zone.id, ...encounter })));
}

// --- 1-3: five zones, exact ids, no beach ---

test("Kalos has exactly 5 encounter zones", () => {
  assert.equal(KALOS_ZONE_DATA.length, 5);
});

test("Kalos zone ids are exactly grassland/water/cave/lava/haunted-house, in that order", () => {
  assert.deepEqual(
    KALOS_ZONE_DATA.map((zone) => zone.id),
    ["grassland", "water", "cave", "lava", "haunted-house"]
  );
});

test("Beach is absent from Kalos zone data (Kalos is a deliberate five-zone region)", () => {
  const zoneIds = KALOS_ZONE_DATA.map((zone) => zone.id);
  assert.ok(!zoneIds.includes("beach" as (typeof zoneIds)[number]));
});

// --- 4-6: zone counts, total, uniqueness ---

test("zone counts match the approved distribution exactly (21/10/13/10/19)", () => {
  const counts = Object.fromEntries(KALOS_ZONE_DATA.map((zone) => [zone.id, zone.encounters.length]));
  assert.deepEqual(counts, {
    grassland: 21,
    water: 10,
    cave: 13,
    lava: 10,
    "haunted-house": 19,
  });
});

test("Kalos contains exactly 73 encounter entries", () => {
  assert.equal(allKalosEncounters().length, 73);
});

test("there are exactly 73 unique species ids across all Kalos zones", () => {
  const ids = new Set(allKalosEncounters().map((encounter) => encounter.pokemonId));
  assert.equal(ids.size, 73);
});

// --- 7-8: base species + Hoopa Unbound coverage ---

test("every official Kalos base species (#650-#721) appears exactly once", () => {
  const kalosBaseIds = POKEMON_DATA.filter(
    (species) => species.formOf === undefined && species.dexNumber >= 650 && species.dexNumber <= 721
  ).map((species) => species.id);
  assert.equal(kalosBaseIds.length, 72, "test assumption: 72 official Kalos base species exist");

  const encounterIds = allKalosEncounters().map((encounter) => encounter.pokemonId);
  const missing = kalosBaseIds.filter((id) => !encounterIds.includes(id));
  assert.deepEqual(missing, [], "no Kalos base species may be missing from the encounter tables");

  for (const id of kalosBaseIds) {
    assert.equal(encounterIds.filter((candidate) => candidate === id).length, 1, `${id} must appear exactly once`);
  }
});

test("Hoopa Unbound (the one approved Kalos alternate form) appears exactly once", () => {
  const ids = allKalosEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(ids.filter((id) => id === "hoopa-unbound").length, 1);
});

test("base Hoopa also appears exactly once (independent of Hoopa Unbound)", () => {
  const ids = allKalosEncounters().map((encounter) => encounter.pokemonId);
  assert.equal(ids.filter((id) => id === "hoopa").length, 1);
});

// --- 9-11: region isolation, unknown ids, no duplicates ---

test("no Gen 1-5 species appears in the Kalos pools (bounded dex-range isolation, not a global-catalog-existence check)", () => {
  // Kalos's own base range is #650-721; every id encountered here must
  // either be a Kalos base species in that range or the one approved
  // alternate form (hoopa-unbound, formOf "hoopa", itself dex #720 — a
  // Kalos-range species, not an earlier one). This tests the actual
  // intended invariant (only approved Kalos internal species appear here),
  // never "does this species exist in the global catalog at all" — the
  // same stale-test mistake already corrected for Sinnoh/Unova.
  const speciesById = new Map(POKEMON_DATA.map((species) => [species.id, species]));
  const offenders = allKalosEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => {
      const species = speciesById.get(id);
      if (!species) return true; // unknown id — caught by the dedicated test below too
      if (species.formOf === undefined) return species.dexNumber < 650 || species.dexNumber > 721;
      // An alternate form is judged by its OWN base's dex number, never by
      // pretending the shared dex row is a separate National Dex entry.
      const base = speciesById.get(species.formOf);
      return !base || base.dexNumber < 650 || base.dexNumber > 721;
    });
  assert.deepEqual(offenders, []);
});

test("no earlier-region species id (Kanto/Johto/Hoenn/Sinnoh/Unova's own encounter pools) appears in the Kalos pools", () => {
  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...UNOVA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  const overlap = allKalosEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => otherRegionIds.has(id));
  assert.deepEqual(overlap, []);
});

test("every referenced Kalos species id resolves in the canonical species catalog", () => {
  const speciesIds = new Set(POKEMON_DATA.map((species) => species.id));
  const unknown = allKalosEncounters()
    .map((encounter) => encounter.pokemonId)
    .filter((id) => !speciesIds.has(id));
  assert.deepEqual(unknown, []);
});

test("no duplicate species ids across all Kalos zones", () => {
  const ids = allKalosEncounters().map((encounter) => encounter.pokemonId);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);
  assert.deepEqual(duplicates, []);
});

test("every zone contains at least one valid encounter", () => {
  for (const zone of KALOS_ZONE_DATA) {
    assert.ok(zone.encounters.length > 0, `${zone.id} must have at least one encounter`);
  }
});

// --- 12-15: approved placements ---

test("Zygarde is in Cave, and only Cave (not Lava)", () => {
  const zygardeZones = KALOS_ZONE_DATA.filter((zone) => zone.encounters.some((e) => e.pokemonId === "zygarde")).map((zone) => zone.id);
  assert.deepEqual(zygardeZones, ["cave"]);

  const lavaZone = KALOS_ZONE_DATA.find((zone) => zone.id === "lava")!;
  assert.ok(!lavaZone.encounters.some((e) => e.pokemonId === "zygarde"), "Zygarde must never appear in Lava");
});

test("Hoopa and Hoopa Unbound are both in Haunted House", () => {
  const hauntedHouse = KALOS_ZONE_DATA.find((zone) => zone.id === "haunted-house")!;
  const ids = hauntedHouse.encounters.map((e) => e.pokemonId);
  assert.ok(ids.includes("hoopa"));
  assert.ok(ids.includes("hoopa-unbound"));
});

test("Hoopa Unbound is independently encounterable from Hoopa — two separate ZoneEncounter entries", () => {
  const hauntedHouse = KALOS_ZONE_DATA.find((zone) => zone.id === "haunted-house")!;
  const hoopaEncounter = hauntedHouse.encounters.find((e) => e.pokemonId === "hoopa");
  const hoopaUnboundEncounter = hauntedHouse.encounters.find((e) => e.pokemonId === "hoopa-unbound");
  assert.ok(hoopaEncounter);
  assert.ok(hoopaUnboundEncounter);
  assert.notEqual(hoopaEncounter, hoopaUnboundEncounter);
});

test("Xerneas is in Grassland; Yveltal and Volcanion are in Lava", () => {
  const grassland = KALOS_ZONE_DATA.find((zone) => zone.id === "grassland")!;
  const lava = KALOS_ZONE_DATA.find((zone) => zone.id === "lava")!;
  assert.ok(grassland.encounters.some((e) => e.pokemonId === "xerneas"));
  assert.ok(lava.encounters.some((e) => e.pokemonId === "yveltal"));
  assert.ok(lava.encounters.some((e) => e.pokemonId === "volcanion"));
});

// --- 20-26: rarity / effective rarity / weights ---

test("the six Kalos evolution-item targets resolve to effective very-rare while their real PokemonSpecies.rarity stays rare", () => {
  const itemEvolutionTargets = ["sylveon", "aromatisse", "slurpuff", "florges", "aegislash", "heliolisk"];
  for (const id of itemEvolutionTargets) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `${id}'s real PokemonSpecies.rarity must stay "rare" (only the effective encounter-rarity tier changes)`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id}'s effective encounter rarity must be "very-rare"`);
  }
});

test("Helioptile -> Heliolisk resolves via Thunder Stone, not Sun Stone (this phase must not restore the old mapping)", () => {
  const heliolisk = POKEMON_DATA.find((species) => species.id === "heliolisk")!;
  assert.equal(heliolisk.rarity, "rare");
  assert.equal(getEffectiveEncounterRarity("heliolisk"), "very-rare");
});

test("Kalos's three starter lines and the Goomy pseudo-legendary line are real very-rare and resolve to effective very-rare", () => {
  for (const id of [
    "chespin", "quilladin", "chesnaught",
    "fennekin", "braixen", "delphox",
    "froakie", "frogadier", "greninja",
    "goomy", "sliggoo", "goodra",
  ]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "very-rare", `${id} must be real rarity "very-rare"`);
    assert.equal(getEffectiveEncounterRarity(id), "very-rare", `${id} must resolve to effective "very-rare"`);
  }
});

test("all 7 Kalos legendary/mythical internal entries are real legendary and resolve to effective legendary", () => {
  for (const id of ["xerneas", "yveltal", "zygarde", "diancie", "hoopa", "hoopa-unbound", "volcanion"]) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "legendary");
    assert.equal(getEffectiveEncounterRarity(id), "legendary");
  }
});

test("all 7 legendary entries use encounterWeight 1", () => {
  const legendaryIds = ["xerneas", "yveltal", "zygarde", "diancie", "hoopa", "hoopa-unbound", "volcanion"];
  const encountersById = new Map(allKalosEncounters().map((e) => [e.pokemonId, e]));
  for (const id of legendaryIds) {
    assert.equal(encountersById.get(id)?.encounterWeight, 1, `${id} must use encounterWeight 1`);
  }
});

test("every effective very-rare encounter (real very-rare species + the six item-evolution targets) uses the established Very Rare weight (5)", () => {
  for (const encounter of allKalosEncounters()) {
    if (getEffectiveEncounterRarity(encounter.pokemonId) === "very-rare") {
      assert.equal(encounter.encounterWeight, 5, `${encounter.pokemonId} (effective very-rare) must use encounterWeight 5`);
    }
  }
});

test("every common encounter uses the established Common weight (20)", () => {
  for (const encounter of allKalosEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    if (species.rarity === "common") {
      assert.equal(encounter.encounterWeight, 20, `${encounter.pokemonId} (common) must use encounterWeight 20`);
    }
  }
});

test("every standalone rare encounter (real rare, not an evolution-item target, not a level-evolution target) uses the established Rare weight (10)", () => {
  const standaloneRareIds = ["furfrou", "hawlucha", "dedenne", "carbink", "klefki"];
  const encountersById = new Map(allKalosEncounters().map((e) => [e.pokemonId, e]));
  for (const id of standaloneRareIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `test assumption: ${id} is real rarity rare`);
    assert.equal(getEffectiveEncounterRarity(id), "rare", `test assumption: ${id} is not an evolution-item target`);
    assert.equal(encountersById.get(id)?.encounterWeight, 10, `${id} (standalone rare) must use encounterWeight 10`);
  }
});

test("every remaining real-rare encounter that IS a level-evolution target uses weight 5, matching the established convention", () => {
  const levelEvolutionTargetRareIds = [
    "diggersby", "talonflame", "vivillon", "pyroar", "gogoat", "pangoro",
    "meowstic", "malamar", "barbaracle", "dragalge", "clawitzer",
    "tyrantrum", "aurorus", "trevenant", "gourgeist", "avalugg", "noivern",
  ];
  const encountersById = new Map(allKalosEncounters().map((e) => [e.pokemonId, e]));
  for (const id of levelEvolutionTargetRareIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must resolve in the species catalog`);
    assert.equal(species!.rarity, "rare", `test assumption: ${id} is real rarity rare`);
    assert.equal(encountersById.get(id)?.encounterWeight, 5, `${id} (rare evolution target) must use encounterWeight 5`);
  }
});

test("real rarity totals across the 73 Kalos entries are common 26 / rare 28 / very-rare 12 / legendary 7", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allKalosEncounters()) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === encounter.pokemonId)!;
    counts[species.rarity]++;
  }
  assert.deepEqual(counts, { common: 26, rare: 28, "very-rare": 12, legendary: 7 });
});

test("effective rarity totals across the 73 Kalos entries are common 26 / rare 22 / very-rare 18 / legendary 7", () => {
  const counts: Record<string, number> = { common: 0, rare: 0, "very-rare": 0, legendary: 0 };
  for (const encounter of allKalosEncounters()) {
    counts[getEffectiveEncounterRarity(encounter.pokemonId)!]++;
  }
  assert.deepEqual(counts, { common: 26, rare: 22, "very-rare": 18, legendary: 7 });
});

test("the approved Kalos REAL rarity classification is locked by exact species-id set, not just aggregate counts", () => {
  // Regression lock for the Kalos Rarity Finalization phase's approved
  // classification. Deliberately asserts exact id sets (not just counts)
  // per tier, so a same-count swap — e.g. Noibat becoming real "rare" while
  // Talonflame becomes real "common" — fails here even though the earlier
  // aggregate-count tests above would stay green.
  const kalosSpeciesIds = POKEMON_DATA.filter(
    (species) =>
      species.id === "hoopa-unbound" ||
      (species.formOf === undefined && species.dexNumber >= 650 && species.dexNumber <= 721)
  );
  assert.equal(kalosSpeciesIds.length, 73, "test assumption: 73 Kalos catalog entries (72 base + Hoopa Unbound)");

  const byRarity: Record<string, string[]> = { common: [], rare: [], "very-rare": [], legendary: [] };
  for (const species of kalosSpeciesIds) {
    byRarity[species.rarity].push(species.id);
  }
  for (const ids of Object.values(byRarity)) ids.sort();

  assert.deepEqual(
    byRarity.common,
    [
      "amaura", "bergmite", "binacle", "bunnelby", "clauncher", "doublade", "espurr", "flabebe",
      "fletchinder", "fletchling", "floette", "helioptile", "honedge", "inkay", "litleo", "noibat",
      "pancham", "phantump", "pumpkaboo", "scatterbug", "skiddo", "skrelp", "spewpa", "spritzee",
      "swirlix", "tyrunt",
    ].sort(),
    "the approved 26 real-common Kalos species must match exactly"
  );

  assert.deepEqual(
    byRarity.rare,
    [
      "aegislash", "aromatisse", "aurorus", "avalugg", "barbaracle", "carbink", "clawitzer", "dedenne",
      "diggersby", "dragalge", "florges", "furfrou", "gogoat", "gourgeist", "hawlucha", "heliolisk",
      "klefki", "malamar", "meowstic", "noivern", "pangoro", "pyroar", "slurpuff", "sylveon",
      "talonflame", "trevenant", "tyrantrum", "vivillon",
    ].sort(),
    "the approved 28 real-rare Kalos species must match exactly"
  );

  assert.deepEqual(
    byRarity["very-rare"],
    [
      "chespin", "quilladin", "chesnaught",
      "fennekin", "braixen", "delphox",
      "froakie", "frogadier", "greninja",
      "goomy", "sliggoo", "goodra",
    ].sort(),
    "the approved 12 real-very-rare Kalos species (three starter lines + Goomy line) must match exactly"
  );

  assert.deepEqual(
    byRarity.legendary,
    ["xerneas", "yveltal", "zygarde", "diancie", "hoopa", "hoopa-unbound", "volcanion"].sort(),
    "the approved 7 real-legendary Kalos entries must match exactly"
  );

  assert.equal(byRarity.common.length, 26);
  assert.equal(byRarity.rare.length, 28);
  assert.equal(byRarity["very-rare"].length, 12);
  assert.equal(byRarity.legendary.length, 7);
});

test("the real -> effective rarity difference set is exactly the six item-evolution targets, no more and no fewer", () => {
  // Locks that ONLY these six species differ between real PokemonSpecies.
  // rarity and getEffectiveEncounterRarity() — if a seventh species picks up
  // an evolution-item target (or one of these six loses its item mapping),
  // this test catches it even though the two aggregate-total tests above
  // would still both pass in some swap scenarios.
  const kalosSpeciesIds = POKEMON_DATA.filter(
    (species) =>
      species.id === "hoopa-unbound" ||
      (species.formOf === undefined && species.dexNumber >= 650 && species.dexNumber <= 721)
  ).map((species) => species.id);

  const diffs = kalosSpeciesIds
    .filter((id) => {
      const species = POKEMON_DATA.find((candidate) => candidate.id === id)!;
      return getEffectiveEncounterRarity(id) !== species.rarity;
    })
    .sort();

  assert.deepEqual(diffs, ["aegislash", "aromatisse", "florges", "heliolisk", "slurpuff", "sylveon"].sort());
});

// --- 27: level ranges ---

test("every encounter has a valid, non-empty minimumLevel/maximumLevel range", () => {
  for (const encounter of allKalosEncounters()) {
    assert.ok(encounter.minimumLevel <= encounter.maximumLevel, `${encounter.pokemonId}: minimumLevel must be <= maximumLevel`);
    assert.ok(encounter.minimumLevel > 0, `${encounter.pokemonId}: minimumLevel must be positive`);
  }
});

// --- 28-29: generic resolver wiring ---

test("Kalos resolves through the generic region-aware resolver (getZoneData/getZone), never a special case", () => {
  assert.equal(getZoneData("kalos").length, 5);
  assert.equal(getZoneData("kalos"), KALOS_ZONE_DATA);

  for (const zoneId of ["grassland", "water", "cave", "lava", "haunted-house"] as const) {
    const zone = getZone("kalos", zoneId);
    assert.ok(zone, `getZone("kalos", "${zoneId}") must resolve`);
    assert.equal(zone!.id, zoneId);
  }
});

test("Kalos is now battle-capable because real zone data exists (getZoneData(\"kalos\").length > 0)", () => {
  assert.ok(getZoneData("kalos").length > 0);
});

// --- 30: region isolation (existing regions unaffected) ---

test("Kanto, Johto, Hoenn, Sinnoh, and Unova zone files are unaffected by Kalos's addition", () => {
  assert.ok(KANTO_ZONE_DATA.length > 0);
  assert.ok(JOHTO_ZONE_DATA.length > 0);
  assert.ok(HOENN_ZONE_DATA.length > 0);
  assert.ok(SINNOH_ZONE_DATA.length > 0);
  assert.ok(UNOVA_ZONE_DATA.length > 0);

  const otherRegionIds = new Set([
    ...KANTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...JOHTO_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...HOENN_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...SINNOH_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
    ...UNOVA_ZONE_DATA.flatMap((zone) => zone.encounters.map((e) => e.pokemonId)),
  ]);
  // Every earlier-region species is still dex 1-649, never touched by the
  // Kalos range — a coarse but effective "nothing here was edited" guard.
  // Exceptions: the Pre-Paldea step appended 7 Sinnoh-owned species at
  // #899-905 (generation-4-pokemon-data.ts's own top-of-file note) — real
  // dex numbers past Kalos's own #650-721 span, but still genuinely Sinnoh,
  // never Kalos. The later Pre-Paldea 17 Hisuian Forms step similarly
  // added 17 Sinnoh-owned alternate-form species (formLabel "Hisuian
  // Form") sharing THEIR bases' real dex numbers, several of which fall
  // inside or past Kalos's own #650-721 span (Sliggoo-Hisui #705,
  // Goodra-Hisui #706, Avalugg-Hisui #713, Decidueye-Hisui #724) — still
  // genuinely Sinnoh, never Kalos, identified by formLabel rather than a
  // dex range since their dex numbers span nearly the whole Pokédex.
  for (const id of otherRegionIds) {
    const species = POKEMON_DATA.find((candidate) => candidate.id === id);
    assert.ok(species, `${id} must still resolve in the species catalog`);
    const isPrePaldeaSinnohSpecies = species!.dexNumber >= 899 && species!.dexNumber <= 905;
    const isPrePaldeaHisuianForm = species!.formLabel === "Hisuian Form";
    assert.ok(
      species!.dexNumber <= 649 || isPrePaldeaSinnohSpecies || isPrePaldeaHisuianForm,
      `${id} (dex ${species!.dexNumber}) must never be a Kalos species`
    );
  }

  // Every earlier region still has its own Beach zone, untouched.
  for (const zoneData of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA]) {
    assert.ok(zoneData.some((zone) => zone.id === "beach"), "earlier regions must keep their own Beach zone");
  }
});

test("the same zoneId resolves to a completely different pool per region — Kalos's own grassland roster never leaks into or from another region", () => {
  const kalosGrassland = getZone("kalos", "grassland")!;
  const kalosIds = new Set(kalosGrassland.encounters.map((e) => e.pokemonId));

  for (const otherRegion of [KANTO_ZONE_DATA, JOHTO_ZONE_DATA, HOENN_ZONE_DATA, SINNOH_ZONE_DATA, UNOVA_ZONE_DATA]) {
    const otherGrassland = otherRegion.find((zone) => zone.id === "grassland");
    for (const encounter of otherGrassland!.encounters) {
      assert.ok(!kalosIds.has(encounter.pokemonId), `${encounter.pokemonId} must not appear in both another region and Kalos grassland`);
    }
  }
});
