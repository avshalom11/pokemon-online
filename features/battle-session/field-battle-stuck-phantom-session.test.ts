// FIELD BATTLE BUG — BROWSER TEST APPROVED. Reproduced live (claude_dev2,
// dedicated dev account) and fixed:
//
// 1. getOrStartBattle (battle-session.service.ts) did a plain
//    findUnique-then-create with no protection against a concurrent
//    request for the SAME player — playerId is this model's own unique
//    key. A genuine race (proven live: every Server Action response
//    carries a fresh RSC render of whatever route is still "current" —
//    Next's own automatic behavior, not something this app controls per
//    call — so an UNRELATED action landing while /battle is still current
//    re-runs BattlePage's own getOrStartBattle) crashed the whole page
//    with an uncaught PrismaClientKnownRequestError (P2002), stranding the
//    player on a frozen error screen with no recoverable UI at all.
// 2. Even after that crash was fixed, the race itself still silently
//    created a PHANTOM new FieldBattleSession the instant escape/
//    party-defeat's own delete had barely committed — the player landed on
//    /map looking fine, but the sidebar stayed locked forever by a battle
//    screen that was never shown for it. Traced to two Server Action calls
//    (the unmount safety-net's getActiveBattleStatusAction, and
//    handleReturnToMap's getPlayerProgressAction re-fetch) both still
//    capable of landing while /battle was nominally current. Both are
//    skippable for escape/party-defeat specifically: those exits already
//    have definitive proof the delete was attempted (no server re-check
//    needed) and never grant a reward (the progress re-fetch was only ever
//    needed for capture's own rare in-flight-reward race).
//
// No React-render/DOM harness exists in this project — #1 is proven
// behaviorally against the real service + fake DB (playerId's own unique
// constraint, same P2002 semantics as real Postgres); #2 is checked at the
// source level, this project's established convention for client-component
// wiring.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import { getOrStartBattle } from "@/features/battle-session/services/battle-session.service";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0, regionId: "kanto" });
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 10, currentHp: 30, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
});

// 1 — the actual crash: two concurrent requests for the same player must
// never throw, regardless of which one's create() call loses the race.
test("1: two concurrent getOrStartBattle calls for the same player never crash (the P2002 race)", async () => {
  const [resultA, resultB] = await Promise.all([
    getOrStartBattle(PLAYER_ID, "grassland", "kanto"),
    getOrStartBattle(PLAYER_ID, "grassland", "kanto"),
  ]);

  assert.equal(resultA.status, "ready");
  assert.equal(resultB.status, "ready");
});

// 2 — the loser must resume the exact session the winner created, never a
// second, independent encounter (which is what silently produced the
// phantom-session/stuck-sidebar bug before the fix).
test("2: the race's loser resumes the winner's own session — exactly one row ever exists", async () => {
  const [resultA, resultB] = await Promise.all([
    getOrStartBattle(PLAYER_ID, "grassland", "kanto"),
    getOrStartBattle(PLAYER_ID, "grassland", "kanto"),
  ]);

  assert.ok(resultA.status === "ready" && resultB.status === "ready");
  if (resultA.status === "ready" && resultB.status === "ready") {
    assert.equal(resultA.battle.wild.pokemon.id, resultB.battle.wild.pokemon.id, "both callers must see the SAME wild encounter, not two independently rolled ones");
  }

  const row = await prisma.fieldBattleSession.findUnique({ where: { playerId: PLAYER_ID } });
  assert.ok(row, "exactly one session must exist after the race settles");
});

// 3 — a mismatched-zone race still redirects the loser correctly rather
// than crashing or silently duplicating (the same "existing session, wrong
// zone" rule the non-racing branch already follows).
test("3: a same-instant race for DIFFERENT zones still resolves safely — no crash, at most one session survives", async () => {
  const [resultA, resultB] = await Promise.all([
    getOrStartBattle(PLAYER_ID, "grassland", "kanto"),
    getOrStartBattle(PLAYER_ID, "cave", "kanto"),
  ]);

  assert.ok(resultA.status === "ready" || resultA.status === "redirect");
  assert.ok(resultB.status === "ready" || resultB.status === "redirect");

  const row = await prisma.fieldBattleSession.findUnique({ where: { playerId: PLAYER_ID } });
  assert.ok(row, "exactly one session must survive the race");
});

const battleContentSrc = fs.readFileSync("features/battle/components/BattleContent.tsx", "utf8");

// 4 — confirmedEndedRef must be set at both places a delete is fired, and
// the unmount cleanup must skip its server re-check exactly when it's true.
test("4: (source) escape and full-party-defeat both mark confirmedEndedRef before the unmount cleanup can run", () => {
  assert.ok(battleContentSrc.includes("const confirmedEndedRef = useRef(false);"));

  const escapeBody = battleContentSrc.slice(battleContentSrc.indexOf("function handleEscape"), battleContentSrc.indexOf("function handleMenuAction"));
  assert.ok(escapeBody.includes("confirmedEndedRef.current = true;"));

  const partyDefeatedBody = battleContentSrc.slice(
    battleContentSrc.indexOf("function resolveCounterAttackAgainstActive"),
    battleContentSrc.indexOf("function startNewEncounter")
  );
  assert.ok(partyDefeatedBody.includes("confirmedEndedRef.current = true;"));

  const cleanupBody = battleContentSrc.slice(battleContentSrc.indexOf("const confirmedEndedRef"), battleContentSrc.indexOf("const [wildState, setWildState]"));
  assert.ok(cleanupBody.includes("if (confirmedEndedRef.current) {"));
  assert.ok(cleanupBody.includes("setActiveBattle(false);"));
  assert.ok(cleanupBody.includes("getActiveBattleStatusAction().then(setActiveBattle);"), "the original server re-check must still exist for every OTHER unmount reason");
});

// 5 — the progress re-fetch must be skipped for confirmed-ended exits (the
// last stray request that could still land while /battle was current) but
// left completely untouched for capture, which never sets this ref.
test("5: (source) the progress re-fetch is skipped exactly when confirmedEndedRef is true — never for capture", () => {
  const returnToMapBody = battleContentSrc.slice(battleContentSrc.indexOf("function handleReturnToMap"), battleContentSrc.indexOf("function resolveCounterAttackAgainstActive"));
  assert.ok(returnToMapBody.includes("if (!confirmedEndedRef.current) {"));
  assert.ok(returnToMapBody.includes("getPlayerProgressAction()"));
  assert.ok(returnToMapBody.includes("router.replace(\"/map\");"));
});

// 6 — the "escaped" phase must render the same manual-fallback overlay
// captured/partyDefeated already have, so a stalled automatic navigation
// (whatever the cause) is never a dead end for the player.
test("6: (source) the escaped phase renders BattleResultOverlay with a manual return-to-map fallback", () => {
  assert.ok(battleContentSrc.includes('phase === "captured" || phase === "partyDefeated" || phase === "escaped"'));
  assert.ok(battleContentSrc.includes('phase === "captured" ? "captured" : phase === "partyDefeated" ? "lost" : "escaped"'));

  const overlaySrc = fs.readFileSync("features/battle/components/BattleResultOverlay.tsx", "utf8");
  assert.ok(overlaySrc.includes('"won" | "lost" | "captured" | "escaped"'));
  assert.ok(overlaySrc.includes("escaped: { icon:"));
});
