import assert from "node:assert/strict";
import { test } from "node:test";

import {
  getChatBanDurationMinutesForOccurrence,
  isValidOwnerChatBanDurationMinutes,
  OWNER_CHAT_BAN_DURATION_OPTIONS_MINUTES,
} from "@/features/moderation/config/chat-ban-progression.config";

// 1
test("1: chat-ban progression matches the canonical table exactly", () => {
  assert.equal(getChatBanDurationMinutesForOccurrence(1), 15);
  assert.equal(getChatBanDurationMinutesForOccurrence(2), 60);
  assert.equal(getChatBanDurationMinutesForOccurrence(3), 12 * 60);
  assert.equal(getChatBanDurationMinutesForOccurrence(4), 24 * 60);
  assert.equal(getChatBanDurationMinutesForOccurrence(5), 3 * 24 * 60);
  assert.equal(getChatBanDurationMinutesForOccurrence(6), 7 * 24 * 60);
});

// 2
test("2: the 6th-and-later ceiling holds for every occurrence past 6", () => {
  const sevenDays = 7 * 24 * 60;
  assert.equal(getChatBanDurationMinutesForOccurrence(7), sevenDays);
  assert.equal(getChatBanDurationMinutesForOccurrence(50), sevenDays);
});

// 3
test("3: occurrence must be a positive integer", () => {
  assert.throws(() => getChatBanDurationMinutesForOccurrence(0));
  assert.throws(() => getChatBanDurationMinutesForOccurrence(-1));
  assert.throws(() => getChatBanDurationMinutesForOccurrence(1.5));
});

// 4
test("4: OWNER's allowed manual chat-ban durations are exactly the six canonical values", () => {
  assert.deepEqual(
    [...OWNER_CHAT_BAN_DURATION_OPTIONS_MINUTES],
    [15, 60, 12 * 60, 24 * 60, 3 * 24 * 60, 7 * 24 * 60]
  );
});

// 5
test("5: every canonical duration is accepted as a valid OWNER manual choice", () => {
  for (const minutes of OWNER_CHAT_BAN_DURATION_OPTIONS_MINUTES) {
    assert.equal(isValidOwnerChatBanDurationMinutes(minutes), true);
  }
});

// 6
test("6: an arbitrary/off-table duration is rejected for OWNER's manual choice", () => {
  assert.equal(isValidOwnerChatBanDurationMinutes(45), false);
  assert.equal(isValidOwnerChatBanDurationMinutes(0), false);
  assert.equal(isValidOwnerChatBanDurationMinutes(-15), false);
  assert.equal(isValidOwnerChatBanDurationMinutes(9999), false);
});
