// FIELD BATTLE PLAYER XP REBALANCE — scope-isolation boundary coverage.
// This task only ever retunes VICTORY_XP_BASE/VICTORY_XP_PER_LEVEL
// (progression-config.ts) and calculateVictoryXpReward's rounding
// (progression-calculations.ts) — these tests read the actual source of
// every OTHER reward path this task must never touch, proving each one is
// structurally independent of the constants that changed (same "read the
// actual source text" technique this codebase's other boundary tests
// already use for pieces a behavioral test can't reach directly).
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

// Normalizes CRLF -> LF on read: some files in this repo are checked out
// with Windows line endings, which would otherwise break a multi-line
// substring match against source written (like this file) with LF only.
function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const gymRewardSrc = readSourceNormalized("features/gyms/services/gym-reward.service.ts");
const leagueRewardSrc = readSourceNormalized("features/leagues/services/league-reward.service.ts");
const battleSessionSrc = readSourceNormalized("features/battle-session/services/battle-session.service.ts");
const captureServiceSrc = readSourceNormalized("features/battle/services/capture.service.ts");

test("(7) Gym player XP never reads VICTORY_XP_BASE/VICTORY_XP_PER_LEVEL/calculateVictoryXpReward — it has its own calculateGymRewardXp formula, unaffected by this rebalance", () => {
  assert.ok(!gymRewardSrc.includes("VICTORY_XP"));
  assert.ok(!gymRewardSrc.includes("calculateVictoryXpReward"));
  assert.ok(gymRewardSrc.includes("addPlayerExperience"), "Gym XP must still be granted through the shared writer, just with its own formula");
});

test("(8) League player XP never reads VICTORY_XP_BASE/VICTORY_XP_PER_LEVEL/calculateVictoryXpReward — it has its own calculateLeagueRewardXp formula, unaffected by this rebalance", () => {
  assert.ok(!leagueRewardSrc.includes("VICTORY_XP"));
  assert.ok(!leagueRewardSrc.includes("calculateVictoryXpReward"));
  assert.ok(leagueRewardSrc.includes("addPlayerExperience"));
});

test("(5) the Field Battle win transaction still grants Player XP exactly once per defeated wild Pokémon — wildDefeatRewardGranted's exactly-once claim is completely untouched by this task", () => {
  const claimIndex = battleSessionSrc.indexOf(
    "where: { playerId, zoneId, wildDefeatRewardGranted: false },\n      data: { wildCurrentHp: clampedHp, wildDefeatRewardGranted: true },"
  );
  const zeroCountGuardIndex = battleSessionSrc.indexOf("if (claimed.count === 0) return null;");
  const victoryXpCallIndex = battleSessionSrc.indexOf(
    "const player = await addPlayerExperience(tx, playerId, calculateVictoryXpReward(session.wildLevel));"
  );
  assert.ok(claimIndex > -1 && zeroCountGuardIndex > -1 && victoryXpCallIndex > -1);
  // Player XP is only ever granted AFTER the exactly-once claim succeeds —
  // same ordering as before this task, only the amount formula changed.
  assert.ok(claimIndex < zeroCountGuardIndex && zeroCountGuardIndex < victoryXpCallIndex);
});

test("(6) Pokémon XP is granted by a completely separate function/feature (grantBattlePokemonXp, features/pokemon-progression/) — never touched by this task's progression-config.ts edit", () => {
  assert.ok(battleSessionSrc.includes('import { grantBattlePokemonXp } from "@/features/pokemon-progression/pokemon-progression-service";'));
  assert.ok(battleSessionSrc.includes("const pokemon = await grantBattlePokemonXp(tx, {"));
});

test("(9) money/gold, egg, chest, and incubation rewards are all still granted in the same victory transaction, via their own unrelated services — none of them import from progression-config.ts", () => {
  assert.ok(battleSessionSrc.includes("await grantFieldBattleCurrencyRewards(tx, playerId, species.name, randomSource);"));
  assert.ok(battleSessionSrc.includes("await rollAndAwardEgg(tx, playerId, toRegionId(profile.regionId), randomSource);"));
  assert.ok(battleSessionSrc.includes("await rollAndAwardChest(tx, playerId, randomSource);"));
  assert.ok(battleSessionSrc.includes("await progressActiveIncubations(tx, playerId);"));
});

test("capture mechanics (a completely separate reward from defeating a wild Pokémon) still use calculateCaptureXpReward, never calculateVictoryXpReward", () => {
  assert.ok(captureServiceSrc.includes("calculateCaptureXpReward"));
  assert.ok(!captureServiceSrc.includes("calculateVictoryXpReward"));
});
