// PLAYER LEVEL ACCESS REQUIREMENTS — focused coverage for the League
// minimum-player-level gate (MIN_LEAGUE_PLAYER_LEVEL = 7), proving the real
// registerForLeague service directly against the in-memory fake DB — same
// "prove the actual server-side gate, not just the constant" posture
// features/gyms/services/gym-access-rules.test.ts already establishes for
// Gyms. Runs registerForLeague itself (never the Server Action wrapper) to
// prove the gate is authoritative even for a direct/bypassing call.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { MIN_LEAGUE_PLAYER_LEVEL } from "@/features/leagues/config/league-access-rules.config";
import { registerForLeague } from "@/features/leagues/services/league-tournament.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

// LEAGUE CYCLE ALIGNMENT FIX (later task) — League I's own week, same
// anchor league-tournament.service.test.ts already uses.
const NOW = new Date("2026-08-03T08:00:00Z"); // Monday — registration open

beforeEach(() => {
  resetFakeDb();
});

// Mirrors league-tournament.service.test.ts's own makeEligiblePlayer, with
// `level` made explicit so the same "otherwise fully badge/champion
// eligible" setup can be reused at both a below-threshold and an
// at-threshold level.
async function makeBadgeEligiblePlayer(playerId: string, level: number, regionIds: readonly string[] = ["kanto", "johto", "hoenn"]) {
  seedPlayerProfile({ id: playerId, level, experience: 0 });
  await prisma.$transaction(async (tx) => {
    for (const regionId of regionIds) {
      await markGymBattleCompleted(tx, playerId, regionId as never, 1, "leader");
      await markGymBattleCompleted(tx, playerId, regionId as never, 2, "leader");
      await markGymBattleCompleted(tx, playerId, regionId as never, 3, "leader");
      await markRegionalChampionDefeated(tx, playerId, regionId as never);
    }
  });
}

test(`MIN_LEAGUE_PLAYER_LEVEL is exactly ${MIN_LEAGUE_PLAYER_LEVEL}`, () => {
  assert.equal(MIN_LEAGUE_PLAYER_LEVEL, 7);
});

test("an otherwise-eligible level 6 player is rejected below-min-level, not ineligible", async () => {
  await makeBadgeEligiblePlayer("p1", MIN_LEAGUE_PLAYER_LEVEL - 1);

  const result = await registerForLeague("p1", "league-1", NOW);
  assert.deepEqual(result, { status: "below-min-level" });
});

test("an otherwise-eligible level 7 player can register (boundary, exact minimum)", async () => {
  await makeBadgeEligiblePlayer("p1", MIN_LEAGUE_PLAYER_LEVEL);

  const result = await registerForLeague("p1", "league-1", NOW);
  assert.equal(result.status, "registered");
});

test("badge/champion eligibility is unchanged for a level 7+ player: no badges still yields ineligible, never below-min-level", async () => {
  seedPlayerProfile({ id: "p1", level: 50, experience: 0 });

  const result = await registerForLeague("p1", "league-1", NOW);
  assert.equal(result.status, "ineligible", "a level 7+ player with no badges must still be rejected on the real badge/champion rule");
});

test("direct registerForLeague calls cannot bypass the level restriction — a below-level player is blocked even calling the service directly, before eligibility or window checks run", async () => {
  // Deliberately NOT badge-eligible either, and calling the raw service
  // function directly (not through the Server Action or any UI) — proves
  // the gate is authoritative at the service layer itself, the true trust
  // boundary, not merely enforced by a client-side disabled button.
  seedPlayerProfile({ id: "p1", level: 1, experience: 0 });

  const result = await registerForLeague("p1", "league-1", NOW);
  assert.deepEqual(result, { status: "below-min-level" });
});
