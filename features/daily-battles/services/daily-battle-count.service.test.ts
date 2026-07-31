// Focused regression test for the one pure, easy-to-get-subtly-wrong piece
// of the daily battle counter: converting an arbitrary instant into its
// Asia/Jerusalem calendar-date key. The increment/read functions
// themselves are exercised end-to-end by battle-action.service.persistence.test.ts
// (via promoteToNextEncounter) rather than duplicated here.
import assert from "node:assert/strict";
import { test } from "node:test";

import { getJerusalemDateKey } from "./daily-battle-count.service.ts";

test("formats as YYYY-MM-DD in Asia/Jerusalem regardless of UTC offset drift", () => {
  // 22:30 UTC on Jan 1st is already Jan 2nd in Jerusalem (UTC+2 in winter,
  // no DST) — the exact kind of near-midnight case a naive
  // toISOString().slice(0, 10) would get wrong.
  const nearMidnightUtc = new Date("2026-01-01T22:30:00.000Z");
  assert.equal(getJerusalemDateKey(nearMidnightUtc), "2026-01-02");
});

test("stays on the same Jerusalem day for a time that hasn't crossed local midnight yet", () => {
  // 10:00 UTC is still afternoon in Jerusalem, nowhere near a day
  // boundary — the plain, unambiguous case.
  const midday = new Date("2026-07-15T10:00:00.000Z");
  assert.equal(getJerusalemDateKey(midday), "2026-07-15");
});

test("is DST-correct across summer (UTC+3) and winter (UTC+2) offsets", () => {
  // 21:30 UTC in July is 00:30 the next day in Jerusalem (DST, UTC+3);
  // 21:30 UTC in January is still 23:30 the same day (standard time, UTC+2)
  // — the same UTC time-of-day landing on different local dates only
  // because of the DST offset change, not because of any date-math bug.
  const summerNearMidnight = new Date("2026-07-15T21:30:00.000Z");
  const winterSameClockTime = new Date("2026-01-15T21:30:00.000Z");
  assert.equal(getJerusalemDateKey(summerNearMidnight), "2026-07-16");
  assert.equal(getJerusalemDateKey(winterSameClockTime), "2026-01-15");
});
