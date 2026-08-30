// GYM BATTLE RESULT DIALOG — SMALL FIX — focused regression coverage for
// the actual root cause: executeGymBattleActionAction (and the voluntary-
// switch/Bag-item actions) used to call revalidatePath() the instant a
// battle-ending action completed, which — per Next.js's own Server Actions
// model (a Server Action that revalidates gets a same-response, SERVER-
// SIDE re-render of the CURRENT route included in its response) — forced
// GymBattlePage's own "no active session -> redirect('/gyms')" guard to
// fire immediately, since the winning transaction had already deleted the
// session. This runs the REAL exported Server Actions (not just the
// underlying service) end-to-end against the fake DB/session/next-cache,
// so it can assert exactly what a real request from GymBattleContent would
// observe: no revalidation (and therefore no forced re-render/redirect)
// until the player's own confirmGymBattleResultAction call.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { confirmGymBattleResultAction, executeGymBattleActionAction, startGymBattleAction } from "@/features/gyms/actions/gym-battle.actions";
import { getGymBattlePartyOptions, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { hasBadge, markGymBattleCompleted } from "@/features/gyms/services/gym-progression.service";
import { prisma } from "@/lib/db/prisma";
import { __setSession } from "../../../test/support/fakes/auth-session.fake.ts";
import { __resetRevalidatePathCalls, revalidatePathCalls } from "../../../test/support/fakes/next-cache.fake.ts";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const EASY: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "easy" };
const LEADER: StartNpcBattleTarget = { source: "gym", regionId: "kanto", gymNumber: 1, battleSlot: "leader" };

beforeEach(() => {
  resetFakeDb();
  __resetRevalidatePathCalls();
  __setSession({ user: { id: PLAYER_ID } });
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0 });
});

async function selectPartyFor(target: StartNpcBattleTarget): Promise<string[]> {
  const options = await getGymBattlePartyOptions(PLAYER_ID, target);
  if (options.status !== "ok") return [];
  return options.options.filter((o) => !o.fainted).slice(0, options.requiredCount).map((o) => o.id);
}

function seedOverwhelmingPlayer(count = 3) {
  for (let i = 1; i <= count; i++) {
    const id = `p${i}`;
    seedPlayerPokemon({ id, playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: i });
    seedKnownMove({ playerPokemonId: id, moveId: "scratch", slot: 1 });
  }
}

test("an Easy victory-completing attack never calls revalidatePath — the root cause of the result dialog auto-dismissing before 'אישור'", async () => {
  seedOverwhelmingPlayer();
  await startGymBattleAction(EASY, await selectPartyFor(EASY));
  __resetRevalidatePathCalls(); // ignore whatever startGymBattleAction itself did (unrelated — it revalidates /gyms BEFORE the battle screen even exists)

  let final;
  for (let i = 0; i < 3; i++) {
    final = await executeGymBattleActionAction("scratch");
  }
  assert.equal((final as { victoryCompleted?: boolean }).victoryCompleted, true, "the Easy team must actually have been defeated");

  assert.deepEqual(
    revalidatePathCalls,
    [],
    "no revalidatePath call may happen as part of the battle-ending action itself — that's what used to force a same-response redirect away from the still-unread result dialog"
  );
});

test("confirmGymBattleResultAction — called only from the player's own 'אישור' click — is the ONE place revalidation happens after a battle ends", async () => {
  await confirmGymBattleResultAction();
  assert.deepEqual(revalidatePathCalls, ["/home", "/gyms", "/inventory"]);
});

test("a Gym Leader victory still grants the Badge/reward exactly once — deferring revalidation never touched reward/progression logic", async () => {
  seedOverwhelmingPlayer(6);
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "easy");
    await markGymBattleCompleted(tx, PLAYER_ID, "kanto", 1, "medium");
  });

  const started = await startGymBattleAction(LEADER, await selectPartyFor(LEADER));
  assert.equal(started.status, "started");
  __resetRevalidatePathCalls();

  let final;
  for (let i = 0; i < 6; i++) {
    final = await executeGymBattleActionAction("scratch");
  }
  assert.equal((final as { victoryCompleted?: boolean }).victoryCompleted, true);
  assert.equal(await hasBadge(PLAYER_ID, "kanto", 1), true, "the Badge must still be granted by the same battle-ending action, unaffected by the revalidation fix");
  assert.deepEqual(revalidatePathCalls, [], "still no revalidatePath call from the battle-ending action itself, even for a reward-granting Leader win");
});

// executeGymBattleActionAction has no randomSource parameter (unlike the
// underlying service, which only accepts one for its OWN focused tests) —
// real Math.random() decides hit/miss/crit here, so a genuine loss can't
// be forced deterministically through this action-layer entry point.
// Structurally, though, the fix already covers every outcome: the ONLY
// revalidatePath call this action ever had was removed entirely (see
// gym-battle.actions.ts's own doc comment), so there is no branch — win,
// lose, or continue — left that could call it. This confirms that
// structural guarantee directly from source, the same technique this
// project's own Gym tasks already use for behavior the test harness can't
// drive deterministically.
test("a defeat (loss) also never calls revalidatePath — it never did, and this fix must not change that (source check: no revalidatePath call exists anywhere in executeGymBattleActionAction)", async () => {
  const fs = await import("node:fs");
  // LINE-ENDING AGNOSTIC — normalized to LF right after reading, so this
  // substring check passes regardless of whether the source file is
  // checked out with LF or CRLF line endings (Windows checkouts commonly
  // use CRLF; the literal patterns below are always written as LF).
  const src = fs.readFileSync("features/gyms/actions/gym-battle.actions.ts", "utf8").replace(/\r\n/g, "\n");
  const actionBody = src.slice(src.indexOf("export async function executeGymBattleActionAction"), src.indexOf("export async function getGymBattleViewDataAction"));
  // Checked as an actual call (with the opening paren) rather than a bare
  // substring match, so this doesn't false-positive on this very
  // invariant being described in the function's own doc comment.
  assert.ok(!actionBody.includes("revalidatePath("), "executeGymBattleActionAction must never call revalidatePath for ANY outcome, including a loss");
});

// Client-side wiring check (this project has no React-render/DOM test
// harness — see this repo's own established *-boundary.test.ts
// convention): confirmVictory (GymBattleContent's ONE navigation trigger
// for every victory dialog — Easy/Medium/Leader/Champion alike) must call
// the new confirmGymBattleResultAction BEFORE navigating, so revalidation
// only ever happens after the player's own "אישור" click.
test("client wiring: confirmVictory calls confirmGymBattleResultAction before navigating away", async () => {
  const fs = await import("node:fs");
  // LINE-ENDING AGNOSTIC — see the doc comment above this file's other
  // readFileSync call for why this normalization is needed.
  const src = fs.readFileSync("features/gyms/components/GymBattleContent.tsx", "utf8").replace(/\r\n/g, "\n");
  assert.ok(src.includes("import {\n  abandonGymBattleAction,\n  confirmGymBattleResultAction,"), "confirmGymBattleResultAction must be imported");
  const confirmVictoryBody = src.match(/function confirmVictory\(\) \{[\s\S]*?\n  \}/)?.[0] ?? "";
  const awaitIndex = confirmVictoryBody.indexOf("await confirmGymBattleResultAction();");
  const pushIndex = confirmVictoryBody.indexOf('router.push("/gyms");');
  assert.ok(awaitIndex > -1 && pushIndex > -1 && awaitIndex < pushIndex, "confirmVictory must await confirmGymBattleResultAction() BEFORE calling router.push");
});

test("a non-victory-completing (battle continues) attack never calls revalidatePath either", async () => {
  seedOverwhelmingPlayer();
  await startGymBattleAction(EASY, await selectPartyFor(EASY));
  __resetRevalidatePathCalls();

  const result = await executeGymBattleActionAction("scratch");
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.victoryCompleted, false, "Easy has 3 NPCs — one hit must not finish the whole team");
  assert.deepEqual(revalidatePathCalls, []);
});
