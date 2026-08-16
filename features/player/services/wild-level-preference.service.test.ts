// MAP — SELECTABLE WILD LEVEL RANGE focused coverage for the read/write/
// resolve service — validates default/fallback behavior, server-side
// unlock enforcement (never trusting a client-picked index), and that a
// stale/invalid stored selection is safely corrected on read.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  getWildLevelBracketPreference,
  resolveEffectiveWildLevelRange,
  setWildLevelBracketPreference,
} from "./wild-level-preference.service.ts";
import { getPlayerProfileRow, resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
});

test("a player who never selected a bracket defaults to the highest bracket unlocked for their current level", async () => {
  seedPlayerProfile({ id: "owner-1", level: 33 }); // unlocks up through index 6 (28-37)

  const preference = await getWildLevelBracketPreference("owner-1");

  assert.equal(preference.selectedIndex, 6);
  assert.deepEqual(preference.selectedRange, { minimumLevel: 28, maximumLevel: 37 });
  assert.equal(preference.unlocked.length, 7, "unlocked list must match the spec's own level-33 example");
});

test("a valid, currently-unlocked stored selection is honored as-is", async () => {
  seedPlayerProfile({ id: "owner-1", level: 33, selectedWildLevelBracketIndex: 2 }); // 9-17, unlocked at level 33

  const preference = await getWildLevelBracketPreference("owner-1");

  assert.equal(preference.selectedIndex, 2);
  assert.deepEqual(preference.selectedRange, { minimumLevel: 9, maximumLevel: 17 });
});

test("a stale stored selection (now above the player's unlocked maximum) safely falls back to the highest unlocked bracket", async () => {
  // Simulates data staleness — e.g. the player's level was somehow lower
  // when this was saved, or the config was rebalanced.
  seedPlayerProfile({ id: "owner-1", level: 10, selectedWildLevelBracketIndex: 11 }); // 53-60, never unlocked at level 10

  const preference = await getWildLevelBracketPreference("owner-1");

  assert.equal(preference.selectedIndex, 1, "must fall back to the highest bracket unlocked at level 10 (index 1, 5-12)");
  assert.deepEqual(preference.selectedRange, { minimumLevel: 5, maximumLevel: 12 });
});

test("an out-of-bounds stored selection safely falls back, never crashes", async () => {
  seedPlayerProfile({ id: "owner-1", level: 5, selectedWildLevelBracketIndex: 999 });

  const preference = await getWildLevelBracketPreference("owner-1");

  assert.equal(preference.selectedIndex, 0);
});

test("setWildLevelBracketPreference persists a valid, unlocked selection", async () => {
  seedPlayerProfile({ id: "owner-1", level: 33 });

  const result = await setWildLevelBracketPreference("owner-1", 3); // 13-22, unlocked at level 33

  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.deepEqual(result.selectedRange, { minimumLevel: 13, maximumLevel: 22 });
  assert.equal(getPlayerProfileRow("owner-1")?.selectedWildLevelBracketIndex, 3);
});

test("setWildLevelBracketPreference rejects a bracket above the player's current unlocked maximum — a level-10 player can never select 53-60", async () => {
  seedPlayerProfile({ id: "owner-1", level: 10 });

  const result = await setWildLevelBracketPreference("owner-1", 11); // 53-60

  assert.equal(result.status, "locked");
  assert.equal(getPlayerProfileRow("owner-1")?.selectedWildLevelBracketIndex, null, "must never write a rejected selection");
});

test("setWildLevelBracketPreference rejects an out-of-bounds/non-integer index outright", async () => {
  seedPlayerProfile({ id: "owner-1", level: 50 });

  const negative = await setWildLevelBracketPreference("owner-1", -1);
  const tooHigh = await setWildLevelBracketPreference("owner-1", 999);
  const fractional = await setWildLevelBracketPreference("owner-1", 1.5);

  assert.equal(negative.status, "invalid-index");
  assert.equal(tooHigh.status, "invalid-index");
  assert.equal(fractional.status, "invalid-index");
  assert.equal(getPlayerProfileRow("owner-1")?.selectedWildLevelBracketIndex, null);
});

test("resolveEffectiveWildLevelRange returns exactly the same range the encounter path should scale to", async () => {
  seedPlayerProfile({ id: "owner-1", level: 33, selectedWildLevelBracketIndex: 0 }); // player picked the lowest bracket despite being level 33

  const range = await resolveEffectiveWildLevelRange("owner-1");

  assert.deepEqual(range, { minimumLevel: 1, maximumLevel: 7 }, "must use the SELECTED bracket, not the player's own highest/current one");
});
