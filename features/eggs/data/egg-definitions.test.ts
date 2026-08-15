import assert from "node:assert/strict";
import { test } from "node:test";

import { EGG_DEFINITIONS, getEggDefinition } from "./egg-definitions.ts";

const EXPECTED_REQUIRED_BATTLES: Record<string, number> = {
  common: 400,
  rare: 600,
  "very-rare": 1000,
  legendary: 1500,
};

test("exactly 4 egg definitions exist, one per PokemonRarity value", () => {
  assert.equal(EGG_DEFINITIONS.length, 4);
  assert.deepEqual(
    EGG_DEFINITIONS.map((definition) => definition.id).sort(),
    ["common", "legendary", "rare", "very-rare"]
  );
});

test("each definition's id and rarity agree", () => {
  for (const definition of EGG_DEFINITIONS) {
    assert.equal(definition.id, definition.rarity);
  }
});

test("required standard-incubator battle counts are exactly 400/600/1000/1500", () => {
  for (const definition of EGG_DEFINITIONS) {
    assert.equal(
      definition.requiredBattlesStandard,
      EXPECTED_REQUIRED_BATTLES[definition.rarity],
      `${definition.rarity} must require exactly ${EXPECTED_REQUIRED_BATTLES[definition.rarity]} battles`
    );
  }
});

test("every definition has a non-empty display name and image path", () => {
  for (const definition of EGG_DEFINITIONS) {
    assert.ok(definition.displayName.length > 0);
    assert.ok(definition.imageUrl.includes(definition.rarity));
    assert.match(definition.imageUrl, /\.png$/);
  }
});

test("getEggDefinition resolves each of the 4 rarities", () => {
  for (const rarity of ["common", "rare", "very-rare", "legendary"] as const) {
    assert.equal(getEggDefinition(rarity).rarity, rarity);
  }
});

test("getEggDefinition throws for an unknown rarity", () => {
  assert.throws(() => getEggDefinition("mythical" as never));
});
