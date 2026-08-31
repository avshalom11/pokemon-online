// LEAGUE AWARDS — focused coverage for getLeagueDisplayNameHe, the ONE
// Hebrew League name lookup the Profile League Awards group reuses (never a
// second/hardcoded League name table).
import assert from "node:assert/strict";
import { test } from "node:test";

import { CYCLE_WEEK_LABELS, getLeagueDisplayNameHe } from "./league-cycle-labels.ts";

test("every leagueId resolves to its own CYCLE_WEEK_LABELS entry, never a hardcoded second copy", () => {
  assert.equal(getLeagueDisplayNameHe("league-1"), "ליגה I");
  assert.equal(getLeagueDisplayNameHe("league-2"), "ליגה II");
  assert.equal(getLeagueDisplayNameHe("league-3"), "ליגה III");
  assert.equal(getLeagueDisplayNameHe("champions-league"), "ליגת האלופים");
});

test("results come straight from CYCLE_WEEK_LABELS by index, never a duplicated literal array", () => {
  assert.equal(getLeagueDisplayNameHe("league-1"), CYCLE_WEEK_LABELS[0]);
  assert.equal(getLeagueDisplayNameHe("champions-league"), CYCLE_WEEK_LABELS[3]);
});
