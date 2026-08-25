// GAME TUTORIAL — PHASE 3: SCRIPTED PIDGEY BATTLE. Runs the real
// attemptCapture (capture.service.ts) against the fake Prisma DB, same
// "real service, fake DB" convention as this directory's own
// capture.service.auto-party.test.ts.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { attemptCapture } from "@/features/battle/services/capture.service";
import { getOrCreateTutorialProgress } from "@/features/tutorial/services/tutorial-progress.service";
import {
  getInventoryItemRow,
  getPlayerPokemonsByPlayerId,
  resetFakeDb,
  seedFieldBattleSession,
  seedInventoryItem,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const ZONE_ID = "grassland";
const NORMAL_BALL = "poke-ball";

function seedBattlerAndSession(playerId: string, options: { isTutorialEncounter?: boolean; wildCurrentHp?: number } = {}) {
  seedPlayerPokemon({ id: "active", playerId, speciesId: "charmander", level: 10, currentHp: 27, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "active", moveId: "scratch", slot: 1 });
  seedFieldBattleSession({
    playerId,
    zoneId: ZONE_ID,
    wildSpeciesId: "pidgey",
    wildLevel: 6,
    wildCurrentHp: options.wildCurrentHp ?? 20,
    wildMaxHp: 20,
    activePlayerPokemonId: "active",
    isTutorialEncounter: options.isTutorialEncounter ?? false,
  });
  seedInventoryItem({ playerId, itemId: NORMAL_BALL, quantity: 1 });
}

beforeEach(() => {
  resetFakeDb();
});

test("a tutorial session's capture is guaranteed even with a plain Poké Ball at full wild HP — never rolled", async () => {
  seedPlayerProfile({ id: "p1" });
  // wildCurrentHp === wildMaxHp (worst real-world capture odds bracket) —
  // a real Poké Ball roll would very likely fail here; the guaranteed
  // bypass must succeed regardless.
  seedBattlerAndSession("p1", { isTutorialEncounter: true, wildCurrentHp: 20 });

  const result = await attemptCapture("p1", NORMAL_BALL);

  assert.equal(result.status, "captured");
});

test("the guaranteed capture really consumes the ball — never a free/unlimited throw", async () => {
  seedPlayerProfile({ id: "p2" });
  seedBattlerAndSession("p2", { isTutorialEncounter: true });

  const result = await attemptCapture("p2", NORMAL_BALL);

  assert.equal(result.status, "captured");
  if (result.status !== "captured") return;
  assert.equal(result.remainingQuantity, 0);
  assert.equal(getInventoryItemRow("p2", NORMAL_BALL)?.quantity ?? 0, 0);
});

test("the captured Pidgey is created through the normal capture ownership path (source: capture) and auto-added to the first free party slot", async () => {
  seedPlayerProfile({ id: "p3" });
  seedBattlerAndSession("p3", { isTutorialEncounter: true });

  const result = await attemptCapture("p3", NORMAL_BALL);
  assert.equal(result.status, "captured");
  if (result.status !== "captured") return;
  assert.equal(result.addedToParty, true);

  const captured = getPlayerPokemonsByPlayerId("p3").find((pokemon) => pokemon.speciesId === "pidgey");
  assert.ok(captured, "the Pidgey must be a real, permanently owned PlayerPokemon row");
  assert.equal(captured!.source, "capture", "must go through the exact same ownership path as any other real capture — never a duplicated/Tutorial-specific creation path");
  assert.equal(captured!.partySlot, 2, "the existing auto-party logic must place it in the first free slot");
});

test("a genuine capture stamps PlayerTutorialProgress.pidgeyCaptured — the one-time server-side proof a real capture happened", async () => {
  seedPlayerProfile({ id: "p4" });
  seedBattlerAndSession("p4", { isTutorialEncounter: true });

  const before = await getOrCreateTutorialProgress("p4");
  assert.equal(before.pidgeyCaptured, false);

  await attemptCapture("p4", NORMAL_BALL);

  const after = await getOrCreateTutorialProgress("p4");
  assert.equal(after.pidgeyCaptured, true);
});

test("a NON-tutorial session's capture is never guaranteed — normal Field Battle capture RNG remains completely unchanged", async () => {
  seedPlayerProfile({ id: "p5" });
  // isTutorialEncounter: false (the default) — full wild HP, the worst
  // real capture-chance bracket, with a plain Poké Ball.
  seedBattlerAndSession("p5", { isTutorialEncounter: false, wildCurrentHp: 20 });

  const originalRandom = Math.random;
  try {
    // Force the real capture roll to miss (rollCapture: `Math.random() <
    // chance` — a value of 1 can never be less than any chance in [0,1]).
    Math.random = () => 1;
    const result = await attemptCapture("p5", NORMAL_BALL);
    assert.equal(result.status, "failed", "a normal encounter must still be genuinely rollable — never silently guaranteed");
  } finally {
    Math.random = originalRandom;
  }
});

test("pidgeyCaptured is never touched by a normal (non-tutorial) capture, successful or not", async () => {
  seedPlayerProfile({ id: "p6" });
  seedBattlerAndSession("p6", { isTutorialEncounter: false, wildCurrentHp: 1 });

  const originalRandom = Math.random;
  try {
    Math.random = () => 0; // guarantees a real roll success (0 < any chance > 0)
    const result = await attemptCapture("p6", NORMAL_BALL);
    assert.equal(result.status, "captured");
  } finally {
    Math.random = originalRandom;
  }

  const progress = await getOrCreateTutorialProgress("p6");
  assert.equal(progress.pidgeyCaptured, false, "a normal capture must never stamp the Tutorial's own one-time flag");
});
