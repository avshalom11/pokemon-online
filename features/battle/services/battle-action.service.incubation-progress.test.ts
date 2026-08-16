// Focused coverage — runs the real executeBattleAction (the actual
// field-battle victory flow) unmodified, same "real service, fake DB" shape
// battle-action.service.egg-drop.test.ts already established. Every
// random-dependent outcome below is deterministic via an injected
// randomSource — no statistical/flaky assertions.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import { executeBattleAction } from "@/features/battle/services/battle-action.service";
import { endBattleSession, syncWildHp } from "@/features/battle-session/services/battle-session.service";
import { startIncubatingEgg } from "@/features/eggs/services/incubation.service";
import {
  resetFakeDb,
  seedFieldBattleSession,
  seedIncubator,
  seedKnownMove,
  seedOwnedEgg,
  seedPlayerPokemon,
  seedPlayerProfile,
  getEggIncubationRow,
} from "../../../test/support/fakes/prisma.fake.ts";
import { prisma } from "@/lib/db/prisma";

const ZONE_ID = "grassland";
// INCUBATOR SPEED MODEL — every eligible victory always adds exactly +1,
// regardless of incubator type (features/eggs/data/incubator-definitions.ts).
const REGULAR_INCREMENT = 1;

async function seedActiveRegularIncubation(playerId: string, rarity: string, battleProgress = 0) {
  const egg = seedOwnedEgg({ playerId, rarity, regionId: "kanto" });
  const incubator = seedIncubator({ playerId, incubatorTypeId: "regular", permanentSlot: 1 });
  const started = await startIncubatingEgg(playerId, incubator.id, egg.id);
  assert.equal(started.status, "started");
  if (battleProgress !== 0) {
    await prisma.playerEggIncubation.update({ where: { ownedEggId: egg.id }, data: { battleProgress } });
  }
  return { eggId: egg.id, incubatorId: incubator.id };
}

function seedGuaranteedVictorySetup(playerId: string) {
  seedPlayerProfile({ id: playerId });
  seedPlayerPokemon({ id: "p1", playerId, speciesId: "charmander", level: 50, currentHp: 50, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
  seedFieldBattleSession({
    playerId,
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 1,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });
}

beforeEach(() => {
  resetFakeDb();
});

test("a field-battle victory increments the active Regular incubation by exactly +1", async () => {
  seedGuaranteedVictorySetup("owner-1");
  const { eggId } = await seedActiveRegularIncubation("owner-1", "common", 5);

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0.999999);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5 + REGULAR_INCREMENT);
  assert.equal(result.experienceGranted?.incubationProgress?.incubationId, eggId);
  assert.equal(result.experienceGranted?.incubationProgress?.battleProgress, 5 + REGULAR_INCREMENT);
});

test("escaping does not increment incubation progress", async () => {
  seedGuaranteedVictorySetup("owner-1");
  const { eggId } = await seedActiveRegularIncubation("owner-1", "common", 5);

  await endBattleSession("owner-1");

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5);
});

test("a loss (party defeated without the wild fainting) does not increment incubation progress", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 100, currentHp: 1, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 3,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });
  const { eggId } = await seedActiveRegularIncubation("owner-1", "common", 5);

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", () => 0.9);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, false);
  assert.equal(result.battleEnded, true);

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5, "a loss must never progress incubation");
});

test("a non-lethal (unfinished) battle action does not increment incubation progress", async () => {
  seedPlayerProfile({ id: "owner-1" });
  seedPlayerPokemon({ id: "p1", playerId: "owner-1", speciesId: "charmander", level: 50, currentHp: 50, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "growl", slot: 1 });
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 100,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });
  const { eggId } = await seedActiveRegularIncubation("owner-1", "common", 5);

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "growl", () => 0);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;
  assert.equal(result.wildFainted, false);

  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5);
});

test("no active incubation means the response reports null and nothing crashes", async () => {
  seedGuaranteedVictorySetup("owner-1");

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0.999999);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.experienceGranted?.incubationProgress, null);
});

test("progress caps at requiredBattleTarget and an already-ready incubation never exceeds it across two separate victories", async () => {
  seedGuaranteedVictorySetup("owner-1");
  // A common egg in a Regular (x1) incubator: requiredBattleTarget equals
  // the base requirement exactly (Math.ceil(400 / 1) = 400).
  const commonTarget = getEggDefinition("common").requiredBattlesStandard;
  const { eggId } = await seedActiveRegularIncubation("owner-1", "common", commonTarget - REGULAR_INCREMENT);

  const first = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0.999999);
  assert.equal(first.status, "success");
  if (first.status !== "success") return;
  assert.equal(getEggIncubationRow(eggId)?.battleProgress, commonTarget);
  assert.equal(first.experienceGranted?.incubationProgress?.isReady, true);

  // A second, independent victory (promoteToNextEncounter already advanced
  // the session to a fresh wild) must not push progress past the target.
  seedFieldBattleSession({
    playerId: "owner-1",
    zoneId: ZONE_ID,
    wildSpeciesId: "bulbasaur",
    wildLevel: 2,
    wildCurrentHp: 1,
    wildMaxHp: 100,
    activePlayerPokemonId: "p1",
  });
  const second = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0.999999);
  assert.equal(second.status, "success");
  if (second.status !== "success") return;
  assert.equal(getEggIncubationRow(eggId)?.battleProgress, commonTarget, `must never exceed ${commonTarget}/${commonTarget}`);
});

for (const [rarity, target] of Object.entries({ common: 400, rare: 600, "very-rare": 1000, legendary: 1500 })) {
  test(`the ${rarity} egg's required battle target used for capping remains exactly ${target}`, () => {
    assert.equal(getEggDefinition(rarity as never).requiredBattlesStandard, target);
  });
}

test("the same defeat cannot progress incubation twice — a retried/racing syncWildHp call is a no-op", async () => {
  seedGuaranteedVictorySetup("owner-1");
  const { eggId } = await seedActiveRegularIncubation("owner-1", "common", 5);

  const first = await syncWildHp("owner-1", ZONE_ID, 0, () => 0.999999);
  assert.ok(first, "the first call must grant the reward");
  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5 + REGULAR_INCREMENT);

  const second = await syncWildHp("owner-1", ZONE_ID, 0, () => 0.999999);
  assert.equal(second, null, "wildDefeatRewardGranted is already true — a retried call must be a no-op");
  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5 + REGULAR_INCREMENT, "progress must not be incremented a second time");
});

test("egg-drop behavior stays independent of incubation progress — both happen together in the same victory", async () => {
  seedGuaranteedVictorySetup("owner-1");
  const { eggId } = await seedActiveRegularIncubation("owner-1", "common", 5);

  // random() = 0 guarantees both a hit/kill AND rollEggDrop(0) < 0.0025.
  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  assert.equal(result.experienceGranted?.egg.dropped, true, "the independent egg-drop roll still fires");
  assert.equal(getEggIncubationRow(eggId)?.battleProgress, 5 + REGULAR_INCREMENT, "the pre-existing incubation still progresses");
});

test("a newly dropped egg is never auto-incubated", async () => {
  seedGuaranteedVictorySetup("owner-1");

  const result = await executeBattleAction("owner-1", ZONE_ID, "attack", "scratch", () => 0);
  assert.equal(result.status, "success");
  if (result.status !== "success") return;

  const egg = result.experienceGranted?.egg;
  assert.equal(egg?.dropped, true);
  if (!egg || !egg.dropped) return;

  assert.equal(getEggIncubationRow(egg.ownedEggId), undefined, "a freshly dropped egg must remain unassigned");
});
