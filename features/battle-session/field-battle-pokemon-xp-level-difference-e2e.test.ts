// FIELD BATTLE POKÉMON XP — REAL VALUE MISMATCH (diagnosis).
//
// Real playtest report: a level 57 Mewtwo defeating a ~level 17 wild still
// showed ~80 XP, even after MIN_LEVEL_MULTIPLIER was retuned from 0.5 to
// 0.15 (expected ~26 XP under the new config).
//
// Traced end-to-end (calculation helper -> grantBattlePokemonXp ->
// applyPokemonXpGrant -> persisted PlayerPokemon.experience):
//   1. raw/base XP:            wildLevel(17) * BASE_POKEMON_XP_MULTIPLIER(10) = 170
//   2. level-difference mult.: clamp(1 + (17-57)*0.05, 0.15, 2.0) = 0.15 (floored)
//   3. calculated XP:          round(170 * 0.15) = 26
//   4. XP passed into grantBattlePokemonXp / applyPokemonXpGrant: 26
//   5. XP written to PlayerPokemon.experience: previousTotalXp + 26 (delta = 26)
//   6. XP "displayed": there is no separate per-Pokémon XP toast anywhere
//      in the app (verified: PokemonLevelUpResult.xpGained/moveLearning
//      are never read outside pokemon-progression-service.ts itself) — the
//      only UI surface is the party XP bar, driven straight off this same
//      persisted newTotalXp, so there's no independent display path that
//      could show a different number than what was actually granted.
//   7. grantBattlePokemonXp/applyPokemonXpGrant each have exactly ONE real
//      call site in the entire codebase (battle-session.service.ts's
//      applyWildHpSync, itself gated by the wildDefeatRewardGranted
//      atomic-claim guard) — no duplicate/second XP path exists.
//
// This test proves, against the real production code (calculateBase-
// BattlePokemonXp, getLevelDifferenceXpMultiplier, grantBattlePokemonXp,
// applyPokemonXpGrant — nothing mocked except the DB layer), that a level
// 57 vs. level 17 fight grants exactly 26 XP end-to-end — confirming the
// formula/config themselves are correct as written. The observed ~80 XP in
// the live playtest was traced to the dev server's own long-running
// process still holding a stale in-memory module reference from before the
// MIN_LEVEL_MULTIPLIER retune — the same class of Turbopack dev-mode
// staleness this project has hit repeatedly (compiled chunks on disk
// already showed the correct 0.15 constant; a full `.next` wipe + restart
// resolved it, no source change needed). Nothing here was a code bug.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { calculateBaseBattlePokemonXp, getLevelDifferenceXpMultiplier, getTotalXpRequiredForPokemonLevel } from "@/features/pokemon-progression/pokemon-progression-calculations";
import { grantBattlePokemonXp } from "@/features/pokemon-progression/pokemon-progression-service";
import { MIN_LEVEL_MULTIPLIER } from "@/features/pokemon-progression/pokemon-progression-config";
import { applyWildHpSync } from "@/features/battle-session/services/battle-session.service";
import { prisma } from "@/lib/db/prisma";
import { getPlayerPokemonRow, resetFakeDb, seedFieldBattleSession, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

const PLAYER_ID = "owner-1";
const MEWTWO_ID = "mewtwo-1";
const FINISHER_LEVEL = 57;
const WILD_LEVEL = 17;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: PLAYER_ID, level: 20, experience: 0 });
  seedPlayerPokemon({
    id: MEWTWO_ID,
    playerId: PLAYER_ID,
    speciesId: "mewtwo",
    level: FINISHER_LEVEL,
    experience: getTotalXpRequiredForPokemonLevel(FINISHER_LEVEL),
    currentHp: 100,
  });
});

test("step 1-3: the pure calculation helper — raw base, multiplier, and final XP for 57 vs 17", () => {
  const multiplier = getLevelDifferenceXpMultiplier(FINISHER_LEVEL, WILD_LEVEL);
  assert.equal(multiplier, MIN_LEVEL_MULTIPLIER, "a -40 level gap must be floored at the configured minimum");
  assert.equal(multiplier, 0.15);

  const xp = calculateBaseBattlePokemonXp(WILD_LEVEL, FINISHER_LEVEL);
  assert.equal(xp, 26, "170 (raw) * 0.15 (multiplier), rounded, must be 26 — not ~80");
});

test("step 4-5: grantBattlePokemonXp end-to-end — the real service+persistence path grants exactly 26 XP, once", async () => {
  const before = getPlayerPokemonRow(MEWTWO_ID)!;

  const results = await prisma.$transaction((tx) =>
    grantBattlePokemonXp(tx, {
      defeatedWildLevel: WILD_LEVEL,
      eligibleParticipantIds: [MEWTWO_ID],
      finisherId: MEWTWO_ID,
      source: "wildBattleVictory",
    })
  );

  assert.equal(results.length, 1, "exactly one grant result for one eligible participant — never a duplicate");
  assert.equal(results[0].xpGained, 26);

  const after = getPlayerPokemonRow(MEWTWO_ID)!;
  assert.equal(after.experience - before.experience, 26, "the persisted PlayerPokemon.experience delta must be exactly 26, not ~80");
});

test("no duplicate grant: calling grantBattlePokemonXp a second time for an already-processed kill (simulating a retry) is the caller's own responsibility via wildDefeatRewardGranted — this function itself has no idempotency guard, by design, and always grants when called", async () => {
  // This documents the actual architecture (grantBattlePokemonXp/
  // applyPokemonXpGrant are NOT self-guarding — the exactly-once guarantee
  // lives one layer up, in applyWildHpSync's wildDefeatRewardGranted
  // atomic claim) rather than asserting a guard that doesn't exist here.
  // Two calls therefore DO grant twice — which is exactly why
  // applyWildHpSync (battle-session.service.ts) is the ONLY real caller,
  // always behind that claim guard, never called directly by anything
  // else (verified: grep for the literal call sites across the whole repo
  // finds exactly one for each function).
  const before = getPlayerPokemonRow(MEWTWO_ID)!;

  await prisma.$transaction((tx) =>
    grantBattlePokemonXp(tx, { defeatedWildLevel: WILD_LEVEL, eligibleParticipantIds: [MEWTWO_ID], finisherId: MEWTWO_ID, source: "wildBattleVictory" })
  );
  await prisma.$transaction((tx) =>
    grantBattlePokemonXp(tx, { defeatedWildLevel: WILD_LEVEL, eligibleParticipantIds: [MEWTWO_ID], finisherId: MEWTWO_ID, source: "wildBattleVictory" })
  );

  const after = getPlayerPokemonRow(MEWTWO_ID)!;
  assert.equal(after.experience - before.experience, 52, "two direct calls grant 26 twice — proving the real bug class (a duplicate CALL) would be visible here, and that protection against it lives in applyWildHpSync's own claim guard, not in this function");
});

test("REAL exactly-once guard: applyWildHpSync (the actual production call site) never double-grants for a racing/retried lethal hit", async () => {
  seedKnownMove({ playerPokemonId: MEWTWO_ID, moveId: "scratch", slot: 1 });
  seedFieldBattleSession({
    playerId: PLAYER_ID,
    zoneId: "grassland",
    wildSpeciesId: "pidgey",
    wildLevel: WILD_LEVEL,
    wildCurrentHp: 0, // already at the lethal blow, same as executeBattleAction hands off
    wildMaxHp: 20,
    activePlayerPokemonId: MEWTWO_ID,
    participants: [{ playerPokemonId: MEWTWO_ID, fainted: false, order: 0 }],
  });

  const before = getPlayerPokemonRow(MEWTWO_ID)!;
  const session = await prisma.fieldBattleSession.findUnique({ where: { playerId: PLAYER_ID } });

  // applyWildHpSync opens its own internal transaction (battle-session.
  // service.ts) — called directly here, exactly like executeBattleAction
  // (battle-action.service.ts) really calls it on a lethal hit.
  const first = await applyWildHpSync(PLAYER_ID, "grassland", 0, session!);
  const second = await applyWildHpSync(PLAYER_ID, "grassland", 0, session!);

  assert.ok(first, "the first (real) kill must grant a reward");
  assert.equal(second, null, "a racing/retried call for the SAME kill must be a no-op — this is the real production guard the request pipeline relies on");

  const after = getPlayerPokemonRow(MEWTWO_ID)!;
  assert.equal(after.experience - before.experience, 26, "the real, guarded production path grants exactly 26 XP once, never twice");
});
