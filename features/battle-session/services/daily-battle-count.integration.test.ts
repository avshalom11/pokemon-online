// Regression coverage for the daily battle counter's one true increment
// point: a confirmed wild-Pokémon victory (promoteToNextEncounter), never
// starting/restoring a session, escaping, or a racing/retried promotion
// call for the same kill. Runs the REAL getOrStartBattle/
// promoteToNextEncounter/endBattleSession unmodified against the in-memory
// fake DB (test/support/fakes/prisma.fake.ts) — see
// battle-action.service.persistence.test.ts's own header comment for why.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import {
  endBattleSession,
  getOrStartBattle,
  promoteToNextEncounter,
} from "@/features/battle-session/services/battle-session.service";
import { getJerusalemDateKey } from "@/features/daily-battles/services/daily-battle-count.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedPlayerPokemon, seedPlayerProfile, getDailyBattleCountRow } from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";
const TODAY = getJerusalemDateKey();

function seedStarter(playerId: string) {
  seedPlayerPokemon({ id: "p1", playerId, speciesId: "charmander", level: 10, currentHp: 100, partySlot: 1 });
}

// Simulates what battle-action.service.ts already did, in the same request,
// before ever calling promoteToNextEncounter for a lethal hit: syncWildHp
// persisting the wild's HP at exactly 0. Flips the fake row directly rather
// than re-deriving damage math this test doesn't care about — the counter's
// behavior only depends on that HP already being 0 by the time
// promoteToNextEncounter runs, not on how it got there.
async function markWildDefeated(playerId: string) {
  await prisma.fieldBattleSession.updateMany({ where: { playerId }, data: { wildCurrentHp: 0 } });
}

beforeEach(() => {
  resetFakeDb();
});

test("starting a brand new session does not increment the daily counter", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedStarter("owner-1");

  const result = await getOrStartBattle("owner-1", ZONE_ID, "kanto");

  assert.equal(result.status, "ready");
  assert.equal(getDailyBattleCountRow("owner-1", TODAY), undefined, "no row should exist yet — nothing has been defeated");
});

test("restoring an existing session (a refresh/reopen) does not increment the counter", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedStarter("owner-1");

  await getOrStartBattle("owner-1", ZONE_ID, "kanto");
  await getOrStartBattle("owner-1", ZONE_ID, "kanto"); // the "refresh" — restores the same row

  assert.equal(getDailyBattleCountRow("owner-1", TODAY), undefined);
});

test("escaping (ending the session without a defeat) never touches the counter", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedStarter("owner-1");

  await getOrStartBattle("owner-1", ZONE_ID, "kanto");
  await endBattleSession("owner-1");

  assert.equal(getDailyBattleCountRow("owner-1", TODAY), undefined);
});

test("promoting after a genuine defeat increments the counter by exactly 1", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedStarter("owner-1");
  await getOrStartBattle("owner-1", ZONE_ID, "kanto");
  await markWildDefeated("owner-1");

  const promoted = await promoteToNextEncounter("owner-1", ZONE_ID, "kanto");

  assert.ok(promoted, "a promotion must happen once the wild is at 0 HP");
  assert.equal(getDailyBattleCountRow("owner-1", TODAY)?.count, 1);
});

test("two consecutive victories increment the counter by exactly 1 each time", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedStarter("owner-1");
  await getOrStartBattle("owner-1", ZONE_ID, "kanto");

  await markWildDefeated("owner-1");
  await promoteToNextEncounter("owner-1", ZONE_ID, "kanto");
  assert.equal(getDailyBattleCountRow("owner-1", TODAY)?.count, 1);

  await markWildDefeated("owner-1");
  await promoteToNextEncounter("owner-1", ZONE_ID, "kanto");
  assert.equal(getDailyBattleCountRow("owner-1", TODAY)?.count, 2);
});

test("a racing/retried promotion call for the same kill never double-counts", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedStarter("owner-1");
  await getOrStartBattle("owner-1", ZONE_ID, "kanto");
  await markWildDefeated("owner-1");

  // Two calls racing (or a duplicate retry) against the exact same 0-HP
  // wild — only the first should actually promote/increment; the second
  // finds wildCurrentHp already nonzero (promoted) and is a safe no-op.
  const [first, second] = await Promise.all([
    promoteToNextEncounter("owner-1", ZONE_ID, "kanto"),
    promoteToNextEncounter("owner-1", ZONE_ID, "kanto"),
  ]);

  const successes = [first, second].filter((result) => result !== null);
  assert.equal(successes.length, 1, "exactly one of the two racing calls should have won");
  assert.equal(getDailyBattleCountRow("owner-1", TODAY)?.count, 1, "the victory must be counted exactly once");
});
