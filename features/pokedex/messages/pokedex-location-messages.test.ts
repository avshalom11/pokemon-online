// POKÉDEX — LOCATION HINTS FOR UNSEEN POKÉMON. Exact copy per rarity tier
// x zone type, verbatim from the task spec.
import assert from "node:assert/strict";
import { test } from "node:test";

import { pokedexLocationHint, pokedexNoKnownLocationMessage } from "./pokedex-location-messages.ts";
import type { RegionId } from "@/shared/types/region";
import type { ZoneId } from "@/shared/types/zone";

const kanto = (zoneId: ZoneId) => [{ regionId: "kanto" as RegionId, zoneId }];

// ===========================================================================
// COMMON / RARE — identical wording for both rarities.
// ===========================================================================
test("common: grass", () => {
  assert.equal(
    pokedexLocationHint("common", kanto("grassland")),
    "הפוקימון הזה נוהג להימצא באזורי הדשא במחוז קאנטו."
  );
});
test("common: water", () => {
  assert.equal(pokedexLocationHint("common", kanto("water")), "הפוקימון הזה נוהג להימצא באזורי המים במחוז קאנטו.");
});
test("common: cave", () => {
  assert.equal(pokedexLocationHint("common", kanto("cave")), "הפוקימון הזה נוהג להימצא במערות של מחוז קאנטו.");
});
test("common: lava", () => {
  assert.equal(pokedexLocationHint("common", kanto("lava")), "הפוקימון הזה נוהג להימצא באזורי הלבה במחוז קאנטו.");
});
test("common: beach", () => {
  assert.equal(pokedexLocationHint("common", kanto("beach")), "הפוקימון הזה נוהג להימצא באזורי החוף במחוז קאנטו.");
});
test("common: haunted house", () => {
  assert.equal(
    pokedexLocationHint("common", kanto("haunted-house")),
    "הפוקימון הזה נוהג להימצא בבית הרוחות במחוז קאנטו."
  );
});
test("rare uses the exact same wording as common", () => {
  for (const zoneId of ["grassland", "water", "cave", "lava", "beach", "haunted-house"] as const) {
    assert.equal(pokedexLocationHint("rare", kanto(zoneId)), pokedexLocationHint("common", kanto(zoneId)));
  }
});

// ===========================================================================
// VERY-RARE
// ===========================================================================
test("very-rare: grass", () => {
  assert.equal(
    pokedexLocationHint("very-rare", kanto("grassland")),
    "מאמנים מדווחים שהפוקימון הזה נצפה באזורי הדשא במחוז קאנטו."
  );
});
test("very-rare: water", () => {
  assert.equal(
    pokedexLocationHint("very-rare", kanto("water")),
    "מאמנים מדווחים שהפוקימון הזה נצפה באזורי המים במחוז קאנטו."
  );
});
test("very-rare: cave", () => {
  assert.equal(
    pokedexLocationHint("very-rare", kanto("cave")),
    "מאמנים מדווחים שהפוקימון הזה נצפה במערות של מחוז קאנטו."
  );
});
test("very-rare: lava", () => {
  assert.equal(
    pokedexLocationHint("very-rare", kanto("lava")),
    "מאמנים מדווחים שהפוקימון הזה נצפה באזורי הלבה במחוז קאנטו."
  );
});
test("very-rare: beach", () => {
  assert.equal(
    pokedexLocationHint("very-rare", kanto("beach")),
    "מאמנים מדווחים שהפוקימון הזה נצפה באזורי החוף במחוז קאנטו."
  );
});
test("very-rare: haunted house", () => {
  assert.equal(
    pokedexLocationHint("very-rare", kanto("haunted-house")),
    "מאמנים מדווחים שהפוקימון הזה נצפה בבית הרוחות במחוז קאנטו."
  );
});

// ===========================================================================
// LEGENDARY
// ===========================================================================
test("legendary: grass", () => {
  assert.equal(
    pokedexLocationHint("legendary", kanto("grassland")),
    "אגדות עתיקות מספרות שהפוקימון הזה מסתתר אי־שם באזורי הדשא של מחוז קאנטו."
  );
});
test("legendary: water", () => {
  assert.equal(
    pokedexLocationHint("legendary", kanto("water")),
    "אגדות עתיקות מספרות שהפוקימון הזה מסתתר אי־שם באזורי המים של מחוז קאנטו."
  );
});
test("legendary: cave", () => {
  assert.equal(
    pokedexLocationHint("legendary", kanto("cave")),
    "אגדות עתיקות מספרות שהפוקימון הזה מסתתר במעמקי המערות של מחוז קאנטו."
  );
});
test("legendary: lava", () => {
  assert.equal(
    pokedexLocationHint("legendary", kanto("lava")),
    "אגדות עתיקות מספרות שהפוקימון הזה מסתתר אי־שם באזורי הלבה של מחוז קאנטו."
  );
});
test("legendary: beach", () => {
  assert.equal(
    pokedexLocationHint("legendary", kanto("beach")),
    "אגדות עתיקות מספרות שהפוקימון הזה מסתתר אי־שם באזורי החוף של מחוז קאנטו."
  );
});
test("legendary: haunted house", () => {
  assert.equal(
    pokedexLocationHint("legendary", kanto("haunted-house")),
    "אגדות עתיקות מספרות שהפוקימון הזה מסתתר בבית הרוחות של מחוז קאנטו."
  );
});

// ===========================================================================
// EXACT REGION SPELLINGS REQUIRED BY THIS TASK.
// ===========================================================================
test("every region uses the exact required Hebrew spelling", () => {
  const expected: Record<string, string> = {
    kanto: "קאנטו",
    johto: "ג'וטו",
    hoenn: "הואן",
    sinnoh: "סינו",
    unova: "יונובה",
    kalos: "קאלוס",
    alola: "אלולה",
    galar: "גאלר",
    paldea: "פלדאה",
  };
  for (const [regionId, name] of Object.entries(expected)) {
    const hint = pokedexLocationHint("common", [{ regionId: regionId as RegionId, zoneId: "grassland" }]);
    assert.ok(hint.includes(name), `expected "${name}" for ${regionId}, got: ${hint}`);
  }
});

// ===========================================================================
// MULTIPLE LOCATIONS — the task's own worked example.
// ===========================================================================
test("multiple locations across different regions/zones join with a bare 'ו', matching the task's own example exactly", () => {
  const hint = pokedexLocationHint("very-rare", [
    { regionId: "kanto", zoneId: "grassland" },
    { regionId: "johto", zoneId: "cave" },
  ]);
  assert.equal(hint, "מאמנים מדווחים שהפוקימון הזה נצפה באזורי הדשא במחוז קאנטו ובמערות של מחוז ג'וטו.");
});

test("three or more locations use a serial comma before the final 'ו'-joined item", () => {
  const hint = pokedexLocationHint("common", [
    { regionId: "kanto", zoneId: "grassland" },
    { regionId: "johto", zoneId: "water" },
    { regionId: "hoenn", zoneId: "lava" },
  ]);
  assert.equal(
    hint,
    "הפוקימון הזה נוהג להימצא באזורי הדשא במחוז קאנטו, באזורי המים במחוז ג'וטו ובאזורי הלבה במחוז הואן."
  );
});

test("an identical (region, zone) location passed twice is never duplicated in the sentence", () => {
  const hint = pokedexLocationHint("common", [
    { regionId: "kanto", zoneId: "grassland" },
    { regionId: "kanto", zoneId: "grassland" },
  ]);
  assert.equal(hint, "הפוקימון הזה נוהג להימצא באזורי הדשא במחוז קאנטו.");
});

test("the no-known-location fallback exists for a species with zero real zone matches", () => {
  assert.equal(typeof pokedexNoKnownLocationMessage, "string");
  assert.ok(pokedexNoKnownLocationMessage.length > 0);
});
