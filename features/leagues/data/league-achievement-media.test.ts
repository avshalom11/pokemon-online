// LEAGUE AWARDS — focused coverage for the canonical leagueAwardImageUrl
// resolver: all 4 Leagues x 3 placements = 12 real combinations, per this
// task's own explicit mapping. Pure data — no DB, no React.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";

import { leagueAwardImageUrl } from "./league-achievement-media.ts";
import type { LeagueId } from "../types/league.types";

test("all 12 leagueId + placement combinations resolve to their exact expected image path", () => {
  const cases: Array<{ leagueId: LeagueId; place: 1 | 2 | 3; expected: string }> = [
    { leagueId: "league-1", place: 1, expected: "/images/leagues/awards/gold-1.png" },
    { leagueId: "league-1", place: 2, expected: "/images/leagues/awards/silver-1.png" },
    { leagueId: "league-1", place: 3, expected: "/images/leagues/awards/arad-1.png" },
    { leagueId: "league-2", place: 1, expected: "/images/leagues/awards/gold-2.png" },
    { leagueId: "league-2", place: 2, expected: "/images/leagues/awards/silver-2.png" },
    { leagueId: "league-2", place: 3, expected: "/images/leagues/awards/arad-2.png" },
    { leagueId: "league-3", place: 1, expected: "/images/leagues/awards/gold-3.png" },
    { leagueId: "league-3", place: 2, expected: "/images/leagues/awards/silver-3.png" },
    { leagueId: "league-3", place: 3, expected: "/images/leagues/awards/arad-3.png" },
    { leagueId: "champions-league", place: 1, expected: "/images/leagues/awards/gold-4.png" },
    { leagueId: "champions-league", place: 2, expected: "/images/leagues/awards/silver-4.png" },
    { leagueId: "champions-league", place: 3, expected: "/images/leagues/awards/arad-4.png" },
  ];

  for (const { leagueId, place, expected } of cases) {
    assert.equal(leagueAwardImageUrl(leagueId, place), expected, `${leagueId} place ${place} must resolve to ${expected}`);
  }
});

test("3rd place always uses 'arad', never 'bronze' — the literal filenames on disk are arad-*.png", () => {
  for (const leagueId of ["league-1", "league-2", "league-3", "champions-league"] as const) {
    assert.ok(leagueAwardImageUrl(leagueId, 3).includes("arad-"), `${leagueId} 3rd place must use the arad- prefix`);
    assert.ok(!leagueAwardImageUrl(leagueId, 3).includes("bronze"), `${leagueId} 3rd place must never say bronze`);
  }
});

test("Champions League maps to award number 4, never 1", () => {
  assert.equal(leagueAwardImageUrl("champions-league", 1), "/images/leagues/awards/gold-4.png");
});

// ASSET VERIFICATION — every path leagueAwardImageUrl can ever produce must
// have a real file on disk under public/, so no Profile/League-page render
// ever needs the SpriteImage fallback for a real, earned award.
test("all 12 award image files actually exist on disk under public/", () => {
  const leagueIds: readonly LeagueId[] = ["league-1", "league-2", "league-3", "champions-league"];
  for (const leagueId of leagueIds) {
    for (const place of [1, 2, 3] as const) {
      const url = leagueAwardImageUrl(leagueId, place);
      const absolutePath = path.join(process.cwd(), "public", url);
      assert.ok(fs.existsSync(absolutePath), `expected file to exist: public${url}`);
    }
  }
});
