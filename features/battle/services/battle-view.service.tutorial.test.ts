// GAME TUTORIAL — PHASE 3: SCRIPTED PIDGEY BATTLE. Runs the real
// getBattleViewData (battle-view.service.ts) against the fake Prisma DB —
// specifically its own forceTutorialEncounter decision, the one place that
// decides whether entering Grassland should start the deterministic
// Tutorial encounter instead of a normal one.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getBattleViewData } from "@/features/battle/services/battle-view.service";
import { attemptCapture } from "@/features/battle/services/capture.service";
import { advanceTutorialStage, advanceTutorialSubStep } from "@/features/tutorial/services/tutorial-progress.service";
import {
  getFieldBattleSessionRow,
  resetFakeDb,
  seedInventoryItem,
  seedKnownMove,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 10, experience: 0, regionId: "kanto" });
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 10, currentHp: 30, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
});

// welcome(0) -> home-sidebar(1) -> my-pokemon(2) -> map(3) -> field-battle(4)
async function reachFieldBattleStage(playerId: string) {
  for (let i = 0; i < 4; i++) {
    await advanceTutorialStage(playerId);
  }
}

// welcome(0) -> home-sidebar(1) -> my-pokemon(2) -> map(3), stopping BEFORE
// field-battle — the exact real state a player is in the instant they click
// Grassland on the map for the very first time (see the MAP CRASH/RACE FIX
// regression test below).
async function reachMapStage(playerId: string) {
  for (let i = 0; i < 3; i++) {
    await advanceTutorialStage(playerId);
  }
}

test("entering Grassland while the Tutorial is genuinely at its own unresolved Field Battle stage starts the deterministic Pidgey encounter", async () => {
  await reachFieldBattleStage(PLAYER_ID);

  const result = await getBattleViewData(PLAYER_ID, "grassland");

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.data.wild.pokemon.id, "pidgey");
  assert.equal(getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter, true);
});

test("a Tutorial player entering a DIFFERENT zone never gets the forced Tutorial encounter", async () => {
  await reachFieldBattleStage(PLAYER_ID);

  const result = await getBattleViewData(PLAYER_ID, "cave");

  assert.equal(result.status, "ready");
  assert.equal(getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter, false);
});

test("a player NOT currently at the Field Battle stage never gets the forced Tutorial encounter, even in Grassland", async () => {
  // Still on "welcome" — never advanced at all.
  const result = await getBattleViewData(PLAYER_ID, "grassland");

  assert.equal(result.status, "ready");
  assert.equal(getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter, false);
});

test("a player who has ALREADY moved past the Field Battle stage never gets the forced Tutorial encounter again", async () => {
  await reachFieldBattleStage(PLAYER_ID);
  await advanceTutorialStage(PLAYER_ID); // field-battle -> pokemon-center

  const result = await getBattleViewData(PLAYER_ID, "grassland");

  assert.equal(result.status, "ready");
  assert.equal(
    getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter,
    false,
    "the Tutorial Pidgey must only ever be obtainable once — a stage that has already moved on must never re-trigger it"
  );
});

// SECURITY — the exact race window closed by checking pidgeyCaptured
// directly, not just currentStageId: the sub-step that advances
// currentStageId away from "field-battle" is a SEPARATE client-triggered
// action (advanceTutorialSubStepAction) that only fires after the capture
// already succeeded — there is a real, if brief, window where a real
// capture has already happened (pidgeyCaptured: true) but the stage hasn't
// advanced yet. A re-entry during exactly that window must never grant a
// second guaranteed capture.
test("once pidgeyCaptured is true, re-entering Grassland never re-triggers the forced encounter — even while the stage id hasn't advanced yet", async () => {
  await reachFieldBattleStage(PLAYER_ID);

  // First real visit: creates and captures the guaranteed Pidgey, exactly
  // like the real player flow (attack/bag steps are irrelevant to capture
  // itself — attemptCapture only reads the session's own isTutorialEncounter
  // flag).
  const firstVisit = await getBattleViewData(PLAYER_ID, "grassland");
  assert.equal(firstVisit.status, "ready");
  seedInventoryItem({ playerId: PLAYER_ID, itemId: "poke-ball", quantity: 1 });
  const captureResult = await attemptCapture(PLAYER_ID, "poke-ball");
  assert.equal(captureResult.status, "captured");

  // The stage is STILL "field-battle" here — only advanceTutorialSubStepAction
  // (a separate client call) would move it on, and this test deliberately
  // never calls it, to prove the race window itself is closed.
  const secondVisit = await getBattleViewData(PLAYER_ID, "grassland");

  assert.equal(secondVisit.status, "ready");
  assert.equal(
    getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter,
    false,
    "pidgeyCaptured alone must be enough to close the guarantee, independent of whether the stage id has advanced yet"
  );
});

// MAP CRASH/RACE FIX — real bug reproduction: the FIRST-EVER click on
// Grassland reaches this server-side function while currentStageId is
// STILL "map" (its own "enter-grassland" step only ever gets marked
// complete by a SEPARATE, LATER client effect — see the fix's own doc
// comment, battle-view.service.ts). Before the fix, this returned a plain
// un-forced RNG encounter; after it, it must still force the deterministic
// Pidgey encounter.
test("clicking Grassland the FIRST time — while currentStageId is still 'map' and its own enter-grassland step is the active target — still starts the deterministic Pidgey encounter, never a normal RNG one", async () => {
  await reachMapStage(PLAYER_ID);
  await advanceTutorialSubStep(PLAYER_ID); // map's own step 0 ("open-map") done — step 1 ("enter-grassland") is now the active target

  const result = await getBattleViewData(PLAYER_ID, "grassland");

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.data.wild.pokemon.id, "pidgey", "must be the real Tutorial Pidgey, never whatever species Grassland's own RNG happened to roll");
  assert.equal(getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter, true);
});

test("on the map stage, BEFORE its own step 0 (open-map) is even done, Grassland does NOT get force-started — the fix is scoped to exactly the active target, never the whole map stage", async () => {
  await reachMapStage(PLAYER_ID);
  // Deliberately never calling advanceTutorialSubStep — currentSubStep is
  // still null, so the active target is step 0 ("sidebar-map"), not yet
  // Grassland.

  const result = await getBattleViewData(PLAYER_ID, "grassland");

  assert.equal(result.status, "ready");
  assert.equal(getFieldBattleSessionRow(PLAYER_ID)?.isTutorialEncounter, false);
});

// GUIDE CHARACTER / OPPONENT NAME — this task's own bug #1. No hardcoded
// Hebrew transliteration exists anywhere for the Tutorial Pidgey (verified
// separately at the registry/session level — see battle-session.service.
// tutorial.test.ts); this asserts the exact value the real battle UI reads
// (BattleContent.tsx's own `enemy: { name: wildState.pokemon.name, ... }`)
// is the species catalog's own real English name field.
test("the Tutorial Pidgey encounter's own display name is exactly the species catalog's English name, 'Pidgey' — the same field the real battle UI reads for the opponent", async () => {
  await reachFieldBattleStage(PLAYER_ID);

  const result = await getBattleViewData(PLAYER_ID, "grassland");

  assert.equal(result.status, "ready");
  if (result.status !== "ready") return;
  assert.equal(result.data.wild.pokemon.name, "Pidgey");
});
