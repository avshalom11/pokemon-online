// REGIONAL CHAMPION — INTRO + VICTORY DIALOG POLISH — the one requirement
// from that task not already covered by source-level boundary checks
// (gym-badges-medals-intro-boundary.test.ts's own "13 (superseded)" test
// already proves structurally that the Champion row's onStart only ever
// sets React state, never calls openSelection/startGymBattleAction
// directly): this actually drives the real service layer and proves no
// NpcBattleSession row exists after only the intro's own read-only data
// call runs — the exact call GymsContent's openSelection makes AFTER the
// player confirms the new Champion intro, but which the intro's own
// onStart/mount never reaches on its own.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getGymBattlePartyOptions, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const KANTO_CHAMPION: StartNpcBattleTarget = { source: "regional-champion", regionId: "kanto" };

beforeEach(() => {
  resetFakeDb();
});

test("no NpcBattleSession exists after only the Champion intro's own read-only party-selection call — a session is only ever created by the LATER, separate startGymBattleAction the player reaches after confirming both the intro AND their party", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 3, "leader");
  });

  // This is the ONLY server call reachable while the Champion intro dialog
  // is open (or if the player cancels it) — GymsContent's confirmChampionIntro
  // only calls openSelection, whose only server call is this read-only one.
  const options = await getGymBattlePartyOptions(PLAYER_ID, KANTO_CHAMPION);
  assert.equal(options.status, "ok");

  const session = await prisma.npcBattleSession.findUnique({ where: { playerId: PLAYER_ID } });
  assert.equal(session, null, "no battle session may exist before the player has confirmed BOTH the intro and their party selection");
});
