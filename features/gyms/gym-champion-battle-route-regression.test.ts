// REGIONAL CHAMPION 404 — FOCUSED FIX (bug ticket) — regression coverage for
// the reported symptom ("starting the Kanto Regional Champion battle sends
// the user to a 404 page"). Investigation found no code path where a
// Regional Champion target produces a different navigation target than a
// Gym battle: GymsContent.tsx's openSelection/confirmSelection both call
// router.push("/gyms/battle") — a single hardcoded literal, never a
// template string built from regionId/battleSource — for EVERY target
// (source: "gym" or source: "regional-champion") alike. These tests pin
// that invariant down structurally (so a future edit can't silently make
// the Champion branch push a different/templated URL) and behaviorally
// (the real pre-battle selection + start flow actually succeeds for all 9
// Regional Champions, not just Kanto).
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { getGymBattlePartyOptions, startNpcBattle, type StartNpcBattleTarget } from "@/features/gyms/services/gym-battle-session.service";
import { markGymBattleCompleted, markRegionalChampionDefeated } from "@/features/gyms/services/gym-progression.service";
import { REGION_GYM_SEQUENCE } from "@/features/gyms/data/region-gym-sequence";
import { getRegionalChampionTeam, REGIONAL_CHAMPION_TEAMS } from "@/features/gyms/data/regional-champion-teams";
import { prisma } from "@/lib/db/prisma";
import { resetFakeDb, seedKnownMove, seedPlayerPokemon, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";
import type { RegionId } from "@/shared/types/region";

const PLAYER_ID = "owner-1";

beforeEach(() => {
  resetFakeDb();
});

function seedParty() {
  seedPlayerPokemon({ id: "p1", playerId: PLAYER_ID, speciesId: "charmander", level: 100, currentHp: 100, partySlot: 1 });
  seedKnownMove({ playerPokemonId: "p1", moveId: "scratch", slot: 1 });
}

async function selectPartyFor(target: StartNpcBattleTarget): Promise<string[]> {
  const options = await getGymBattlePartyOptions(PLAYER_ID, target);
  if (options.status !== "ok") return [];
  return options.options.filter((o) => !o.fainted).slice(0, options.requiredCount).map((o) => o.id);
}

async function earnAllThreeBadges(regionId: RegionId) {
  await prisma.$transaction(async (tx) => {
    await markGymBattleCompleted(tx, PLAYER_ID, regionId, 1, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, regionId, 2, "leader");
    await markGymBattleCompleted(tx, PLAYER_ID, regionId, 3, "leader");
  });
}

// 1. Kanto Champion produces a valid, existing battle route.
test("Kanto Champion: GymsContent's Champion row navigates to the exact same literal route ('/gyms/battle') a Gym battle uses — never a template/region-scoped URL", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/gyms/components/GymsContent.tsx", "utf8");

  // The Champion row's onStart now opens the Champion intro dialog first
  // (REGIONAL CHAMPION — INTRO + VICTORY DIALOG POLISH task); confirming
  // that intro is what actually wires into openSelection with a
  // regional-champion target — confirm that chain still exists and still
  // ends up at the same target shape.
  assert.ok(
    src.includes("onStart={() => setChampionIntroRegionId(region.regionId)}"),
    "ChampionRow must open the Champion intro dialog first"
  );
  assert.ok(
    src.includes('source: "regional-champion", regionId: championIntroRegionId };\n    setChampionIntroRegionId(null);\n    openSelection(target);'),
    "confirming the Champion intro must call openSelection with a regional-champion target"
  );

  // Both navigation points (the "resuming" fast-path inside openSelection,
  // and confirmSelection's own success path) push the identical literal —
  // neither is gated on target.source, and neither interpolates regionId/
  // battleSource into the URL.
  const pushMatches = [...src.matchAll(/router\.push\((.*?)\);/g)].map((m) => m[1]);
  const battlePushes = pushMatches.filter((call) => call.includes("/gyms/battle"));
  assert.ok(battlePushes.length >= 2, "expected at least 2 router.push calls targeting the battle screen (resuming + confirmSelection)");
  for (const call of battlePushes) {
    assert.equal(call, '"/gyms/battle"', `every navigation into the battle screen must be the exact literal "/gyms/battle", got: ${call}`);
  }
});

// 2. All 9 Champions use the valid route (no per-region branching exists in
// the navigation code at all — the same openSelection/confirmSelection path
// is shared, parameterized only by data, never by a region-specific URL).
test("all 9 Regional Champions share one navigation path — no region-specific battle URL branch exists", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/gyms/components/GymsContent.tsx", "utf8");

  assert.equal(REGION_GYM_SEQUENCE.length, 9);
  // There is exactly one ChampionRow render site (one JSX call), not one
  // per region — regions are handled by data (the `region` prop), so a
  // regression that special-cased any single region's navigation would
  // require a second render/onStart site, which this assertion would catch.
  const championRowUsages = src.match(/<ChampionRow\b/g) ?? [];
  assert.equal(championRowUsages.length, 1, "ChampionRow must be rendered from one generic call site, never duplicated per region");

  // Data completeness: every one of the 9 regions actually has a fixed
  // Champion team (regional-champion-teams.ts is a plain array + .find(),
  // NOT a Record<RegionId,...>, so unlike gym-trainer-names.ts this is not
  // statically guaranteed exhaustive by TypeScript — a missing region here
  // degrades startNpcBattle to "invalid-target" instead of a real battle).
  for (const regionId of REGION_GYM_SEQUENCE) {
    assert.ok(getRegionalChampionTeam(regionId), `Regional Champion team data missing for ${regionId}`);
  }
  assert.equal(REGIONAL_CHAMPION_TEAMS.length, 9, "exactly 9 Regional Champion team definitions must exist, one per region");
});

// 3. Gym battles still use the same valid route (unchanged sibling
// assertion — Gym rows funnel through the identical openSelection/
// confirmSelection pair as Champion rows, confirmed by the shared-literal
// check in test 1 already covering both call sites unconditionally).
test("Gym battles still resolve through the same shared navigation path as Champion battles (GymRow also wires into openSelection, not a separate flow)", async () => {
  const fs = await import("node:fs");
  const src = fs.readFileSync("features/gyms/components/GymsContent.tsx", "utf8");
  assert.ok(src.includes("onStart={(battleSlot) => handleGymStart(region.regionId, gym.gymNumber, battleSlot)}"), "GymRow must still call handleGymStart");
  assert.ok(src.includes("openSelection({ source: \"gym\", regionId, gymNumber, battleSlot })"), "handleGymStart must still route into the shared openSelection function");
});

// 4. Champion party selection/start still works — the real pre-battle
// selection read (getGymBattlePartyOptions) and the real session-creating
// action (startNpcBattle) both succeed end-to-end for a regional-champion
// target, across all 9 regions in sequence (each region's champion is only
// reachable once its own 3 Badges are earned and the previous region's
// champion is defeated — exercising the exact same server-side gates the
// UI's openSelection/confirmSelection Server Actions depend on).
test("Champion party selection + battle start succeeds end-to-end for all 9 Regional Champions in sequence", async () => {
  seedPlayerProfile({ id: PLAYER_ID, level: 50, experience: 0 });
  seedParty();

  for (const regionId of REGION_GYM_SEQUENCE) {
    await earnAllThreeBadges(regionId);

    const target: StartNpcBattleTarget = { source: "regional-champion", regionId };

    const options = await getGymBattlePartyOptions(PLAYER_ID, target);
    assert.equal(options.status, "ok", `${regionId}: party selection must succeed once all 3 Badges are earned`);

    const started = await startNpcBattle(PLAYER_ID, target, await selectPartyFor(target));
    assert.equal(started.status, "started", `${regionId}: Champion battle must actually start, not fail/redirect elsewhere`);

    // Fast-forward to the next region's prerequisite without playing out
    // the full battle — mirrors gym-access-rules.test.ts's own established
    // "full region chain" convention.
    await prisma.npcBattleSession.deleteMany({ where: { playerId: PLAYER_ID } });
    await prisma.$transaction((tx) => markRegionalChampionDefeated(tx, PLAYER_ID, regionId));
  }
});
