// RIGHT SIDEBAR STUCK IN ACTIVE-BATTLE MODE — FOCUSED DIAGNOSIS/FIX.
//
// Root cause: BattleContent.tsx's handleEscape (and the full-party-defeat
// path) fired endBattleSessionAction() WITHOUT awaiting it before
// navigating away via handleReturnToMap's router.replace. That navigation
// unmounts BattleContent, whose cleanup effect (active-battle-context.tsx)
// re-verifies the sidebar lock against the real DB
// (getActiveBattleStatusAction, a thin wrapper around hasActiveBattleSession
// — see that action's own doc comment). Two independent, unawaited server
// round trips have no ordering guarantee: the re-check could resolve BEFORE
// the delete had actually committed, find the session "still there," and
// re-lock the sidebar even though the player had genuinely just fled/lost —
// stranding them on another page with no battle screen mounted and no way
// to clear the lock (this project's own prior stale-Turbopack-cache
// incidents ruled out — this is a real client/server ordering bug, not a
// cache issue).
//
// The fix (features/battle/components/BattleContent.tsx): both exits now
// record the delete's own Promise in a ref (endSessionPromiseRef) instead
// of firing-and-forgetting it; handleReturnToMap waits for that promise to
// SETTLE (`.finally`, never `.then`, so a rare failed delete still lets the
// player leave rather than trapping them) before it ever navigates — so the
// unmount's re-check can only ever run after the deletion has committed.
// Capture is untouched (its own session deletion is already atomic with
// the capture transaction — see endBattleSessionAction's own doc comment),
// and the lock/re-check mechanism itself is completely unmodified: this is
// a pure ordering fix, never a weakening of the lock.
//
// No React-render/DOM harness exists in this project (established
// convention across every *-boundary.test.ts file) — the ordering
// invariant is proven behaviorally at the service layer (the exact
// primitives BattleContent/layout.tsx actually call), and the fix's wiring
// into BattleContent.tsx itself is checked at the source level.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { endBattleSession, hasActiveBattleSession } from "@/features/battle-session/services/battle-session.service";
import { abandonNpcBattleSession, getGymBattlePartyOptions, hasActiveNpcBattleSession, startNpcBattle } from "@/features/gyms/services/gym-battle-session.service";
import { hasActiveLeagueBattleSession } from "@/features/leagues/services/league-battle-session.service";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedFieldBattleSession,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

function seedBattleReadyParty() {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
}

// 5 — no active DB session anywhere → every check layout.tsx ORs together
// (hasFieldBattle || hasNpcBattle || hasLeagueBattle) must independently
// report false, so a fresh player never starts locked.
test("5: no active DB session for any battle type → layout initializes unlocked", async () => {
  const [hasField, hasNpc, hasLeague] = await Promise.all([
    hasActiveBattleSession(PLAYER_ID),
    hasActiveNpcBattleSession(PLAYER_ID),
    hasActiveLeagueBattleSession(PLAYER_ID),
  ]);
  assert.equal(hasField, false);
  assert.equal(hasNpc, false);
  assert.equal(hasLeague, false);
  assert.equal(hasField || hasNpc || hasLeague, false);
});

// 4 — Field Battle mount/unmount: a real FieldBattleSession row locks, and
// endBattleSession (the primitive both handleEscape and the full-party-
// defeat path call) reliably clears it.
test("4: Field Battle — a real session locks, endBattleSession unlocks it", async () => {
  seedBattleReadyParty();
  seedFieldBattleSession({
    playerId: PLAYER_ID,
    zoneId: "grassland",
    wildSpeciesId: "croagunk",
    wildLevel: 22,
    wildCurrentHp: 53,
    wildMaxHp: 53,
    activePlayerPokemonId: "p1",
  });
  assert.equal(await hasActiveBattleSession(PLAYER_ID), true);

  await endBattleSession(PLAYER_ID);
  assert.equal(await hasActiveBattleSession(PLAYER_ID), false);
});

// 1 + 2 — Gym battle mount locks, and its own confirm/abandon exits
// (already correctly awaited before navigating — GymBattleContent's
// confirmVictory/confirmAbandon both `await ... then router.push`, unlike
// Field Battle's former bug) reliably unlock afterward.
test("1+2: Gym battle — starting locks (hasActiveNpcBattleSession), abandoning unlocks it", async () => {
  seedBattleReadyParty();
  const options = await getGymBattlePartyOptions(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" });
  assert.equal(options.status, "ok");
  const partyIds = options.status === "ok" ? options.options.map((o) => o.id) : [];

  const started = await startNpcBattle(PLAYER_ID, { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" }, partyIds);
  assert.equal(started.status, "started");
  assert.equal(await hasActiveNpcBattleSession(PLAYER_ID), true, "starting a Gym battle must lock navigation");

  await abandonNpcBattleSession(PLAYER_ID);
  assert.equal(await hasActiveNpcBattleSession(PLAYER_ID), false, "abandoning must unlock navigation");
});

// 3 — League battle mount/unmount: an in-progress LeagueBattleSession for
// one of the player's own tournament participants locks; once the match is
// no longer in-progress (completed), it unlocks — hasActiveLeagueBattleSession
// only ever counts status === "in-progress" rows.
test("3: League battle — an in-progress match locks, completion unlocks it", async () => {
  const participant = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: "tournament-1", playerId: PLAYER_ID, participantType: "player" },
  });
  const opponent = await prisma.leagueTournamentParticipant.create({
    data: { tournamentId: "tournament-1", playerId: "owner-2", participantType: "player" },
  });
  const session = await prisma.leagueBattleSession.create({
    data: { tournamentMatchId: "match-1", participantAId: participant.id, participantBId: opponent.id },
  });

  // Freshly created ("waiting-for-players") does not count as active yet.
  assert.equal(await hasActiveLeagueBattleSession(PLAYER_ID), false);

  await prisma.leagueBattleSession.update({ where: { id: session.id }, data: { status: "in-progress" } });
  assert.equal(await hasActiveLeagueBattleSession(PLAYER_ID), true, "an in-progress match must lock navigation");

  await prisma.leagueBattleSession.update({ where: { id: session.id }, data: { status: "completed" } });
  assert.equal(await hasActiveLeagueBattleSession(PLAYER_ID), false, "a completed match must unlock navigation");
});

// 6 — the actual stale-client-state fix, proven two ways: (a) behaviorally,
// that AWAITING the delete before checking status is reliable (the
// invariant the fix depends on); (b) at the source level, that
// BattleContent.tsx's exits actually wait for that delete before
// navigating, rather than firing-and-forgetting it like before.
test("6a: (behavioral) awaiting endBattleSession before the unmount status re-check always reports unlocked — no race window", async () => {
  seedBattleReadyParty();
  seedFieldBattleSession({
    playerId: PLAYER_ID,
    zoneId: "grassland",
    wildSpeciesId: "croagunk",
    wildLevel: 22,
    wildCurrentHp: 53,
    wildMaxHp: 53,
    activePlayerPokemonId: "p1",
  });
  assert.equal(await hasActiveBattleSession(PLAYER_ID), true);

  // Mirrors the fixed handleReturnToMap: await the delete, THEN check
  // status (what the unmount effect's getActiveBattleStatusAction does) —
  // this can never observe a not-yet-deleted row once sequenced this way.
  await endBattleSession(PLAYER_ID);
  const stillActive = await hasActiveBattleSession(PLAYER_ID);
  assert.equal(stillActive, false, "once the delete is awaited first, the re-check must never see a stale session");
});

const battleContentSrc = fs.readFileSync("features/battle/components/BattleContent.tsx", "utf8");

test("6b: (source) escape and full-party-defeat record the delete's Promise instead of firing-and-forgetting it", () => {
  assert.ok(
    battleContentSrc.includes("const endSessionPromiseRef = useRef<Promise<void> | null>(null);"),
    "a ref must track the in-flight session-ending delete"
  );
  const escapeBody = battleContentSrc.slice(battleContentSrc.indexOf("function handleEscape"), battleContentSrc.indexOf("function handleMenuAction"));
  assert.ok(
    escapeBody.includes("endSessionPromiseRef.current = endBattleSessionAction();"),
    "handleEscape must record the delete's Promise, not fire-and-forget it"
  );
  assert.ok(!/^\s*endBattleSessionAction\(\);\s*$/m.test(escapeBody), "handleEscape must never call endBattleSessionAction() without capturing its Promise");

  const partyDefeatedBody = battleContentSrc.slice(
    battleContentSrc.indexOf("function resolveCounterAttackAgainstActive"),
    battleContentSrc.indexOf("function startNewEncounter")
  );
  assert.ok(
    partyDefeatedBody.includes("endSessionPromiseRef.current = endBattleSessionAction();"),
    "the full-party-defeat path must also record the delete's Promise, not fire-and-forget it"
  );
});

test("6c: (source) handleReturnToMap waits for the pending delete to settle (via .finally, never .then) before navigating", () => {
  const returnToMapBody = battleContentSrc.slice(
    battleContentSrc.indexOf("function handleReturnToMap"),
    battleContentSrc.indexOf("function resolveCounterAttackAgainstActive")
  );
  assert.ok(returnToMapBody.includes("const pendingEndSession = endSessionPromiseRef.current;"));
  assert.ok(returnToMapBody.includes("endSessionPromiseRef.current = null;"));
  // FIELD BATTLE STUCK (later task) — the router.replace call this test
  // originally checked for directly now lives inside a named `proceed`
  // function (features/battle-session/field-battle-stuck-phantom-session.
  // test.ts covers its own skip-the-progress-refetch behavior); `.finally`
  // still gates it exactly the same way, just via that function reference.
  assert.ok(
    returnToMapBody.includes("pendingEndSession.finally(proceed);"),
    "must use .finally (not .then) so a rare failed delete still lets the player leave, rather than trapping them"
  );
  assert.ok(returnToMapBody.includes('router.replace("/map");'));
  assert.ok(!returnToMapBody.includes("pendingEndSession.then("), "must never gate navigation on .then alone (a rejection would silently strand the player)");
});

test("6d: (source) the lock/re-check mechanism itself is unmodified — never weakened, never removed", () => {
  assert.ok(
    battleContentSrc.includes("getActiveBattleStatusAction().then(setActiveBattle);"),
    "Field Battle's unmount must still re-verify against the real DB session, not just assume false"
  );

  const layoutSrc = fs.readFileSync("app/(game)/layout.tsx", "utf8");
  assert.ok(layoutSrc.includes("hasActiveBattleSession(profile.id)"));
  assert.ok(layoutSrc.includes("hasActiveNpcBattleSession(profile.id)"));
  assert.ok(layoutSrc.includes("hasActiveLeagueBattleSession(profile.id)"));
  assert.ok(layoutSrc.includes("const activeBattle = hasFieldBattle || hasNpcBattle || hasLeagueBattle;"), "all three battle types must still gate the lock — never weakened to fewer checks");

  // Gym's own exits were already race-free (await before navigate) — a
  // regression guard so this fix's pattern doesn't get undone there either.
  const gymSrc = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8");
  assert.ok(gymSrc.includes("await confirmGymBattleResultAction();"));
  assert.ok(gymSrc.includes("await abandonGymBattleAction();"));
});
