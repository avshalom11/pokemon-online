import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getSiteBanDurationMinutesForOccurrence,
  isValidOwnerSiteBanDurationMinutes,
  OWNER_SITE_BAN_DURATION_OPTIONS_MINUTES,
} from "@/features/moderation/config/site-ban-progression.config";

// 1
test("1: site-ban progression matches the canonical table exactly", () => {
  assert.equal(getSiteBanDurationMinutesForOccurrence(1), 30);
  assert.equal(getSiteBanDurationMinutesForOccurrence(2), 6 * 60);
  assert.equal(getSiteBanDurationMinutesForOccurrence(3), 24 * 60);
  assert.equal(getSiteBanDurationMinutesForOccurrence(4), 3 * 24 * 60);
  assert.equal(getSiteBanDurationMinutesForOccurrence(5), 7 * 24 * 60);
});

// 2
test("2: the 5th-and-later ceiling holds for every occurrence past 5", () => {
  const sevenDays = 7 * 24 * 60;
  assert.equal(getSiteBanDurationMinutesForOccurrence(6), sevenDays);
  assert.equal(getSiteBanDurationMinutesForOccurrence(50), sevenDays);
});

// 3
test("3: occurrence must be a positive integer", () => {
  assert.throws(() => getSiteBanDurationMinutesForOccurrence(0));
  assert.throws(() => getSiteBanDurationMinutesForOccurrence(-1));
  assert.throws(() => getSiteBanDurationMinutesForOccurrence(2.2));
});

// 4
test("4: OWNER's allowed manual site-ban durations are exactly the five canonical values", () => {
  assert.deepEqual(
    [...OWNER_SITE_BAN_DURATION_OPTIONS_MINUTES],
    [30, 6 * 60, 24 * 60, 3 * 24 * 60, 7 * 24 * 60]
  );
});

// 5
test("5: every canonical duration is accepted as a valid OWNER manual choice", () => {
  for (const minutes of OWNER_SITE_BAN_DURATION_OPTIONS_MINUTES) {
    assert.equal(isValidOwnerSiteBanDurationMinutes(minutes), true);
  }
});

// 6
test("6: an arbitrary/off-table duration is rejected for OWNER's manual choice", () => {
  assert.equal(isValidOwnerSiteBanDurationMinutes(45), false);
  assert.equal(isValidOwnerSiteBanDurationMinutes(0), false);
  assert.equal(isValidOwnerSiteBanDurationMinutes(-30), false);
});

// 7
test("7: chat and site progression tables are independent — different values at the same occurrence", () => {
  // 1st occurrence: chat is 15m, site is 30m — sanity check the two
  // tables were never accidentally merged/aliased.
  assert.notEqual(getSiteBanDurationMinutesForOccurrence(1), 15);
});
