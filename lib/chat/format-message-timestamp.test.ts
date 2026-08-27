// CHAT TIMESTAMPS — SHOW DATE + TIME. Focused coverage for the shared
// formatter both Global Chat and Private Chat now use, replacing their own
// previously-separate HH:MM-only implementations.
import assert from "node:assert/strict";
import { test } from "node:test";

import { formatChatMessageTimestamp } from "./format-message-timestamp.ts";

test("formats as DD/MM/YYYY HH:MM in Asia/Jerusalem wall-clock time", () => {
  // 2026-08-27T11:41:00Z is 14:41 in Asia/Jerusalem (UTC+3 in August, DST).
  const date = new Date("2026-08-27T11:41:00.000Z");
  assert.equal(formatChatMessageTimestamp(date), "27/08/2026 14:41");
});

test("zero-pads single-digit day/month/hour/minute", () => {
  // 2026-01-05T05:07:00Z is 07:07 in Asia/Jerusalem (UTC+2 in January).
  const date = new Date("2026-01-05T05:07:00.000Z");
  assert.equal(formatChatMessageTimestamp(date), "05/01/2026 07:07");
});

test("derives the label from the exact Date instance passed in, not the current time", () => {
  const past = new Date("2020-03-15T10:00:00.000Z");
  const label = formatChatMessageTimestamp(past);
  assert.match(label, /^15\/03\/2020 \d{2}:\d{2}$/);
});
