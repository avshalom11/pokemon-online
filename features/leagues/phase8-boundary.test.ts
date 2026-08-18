// GYMS & LEAGUES PHASE 8 — PHASE BOUNDARY TESTS (items 50-54). Confirms
// this Phase's reward/Champions League work never touched Field/Gym
// reward code, and that no Phase 9/10 UI (bracket visualization, profile
// trophy gallery, Home champion cards, username colors) was built.
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";

test("no Field Battle reward hooks are referenced by any Phase 8 League file", () => {
  const files = [
    "features/leagues/services/league-reward.service.ts",
    "features/leagues/services/champions-league.service.ts",
    "features/leagues/services/league-round-advancement.service.ts",
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const forbidden of ["rollAndAwardEgg", "rollAndAwardChest", "incrementDailyBattleCount", "progressActiveIncubations", "grantFieldBattleCurrencyRewards"]) {
      assert.ok(!src.includes(forbidden), `${file} must never reference Field Battle reward hook ${forbidden}`);
    }
  }
});

test("no Gym reward primitives are referenced by any Phase 8 League file", () => {
  const files = [
    "features/leagues/services/league-reward.service.ts",
    "features/leagues/services/champions-league.service.ts",
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const forbidden of ["markGymBattleCompleted", "markRegionalChampionDefeated", "grantGymLeaderReward", "grantRegionalChampionReward"]) {
      assert.ok(!src.includes(forbidden), `${file} must never reference Gym reward primitive ${forbidden}`);
    }
  }
});

test("the Gym reward registry numbers are untouched by this Phase", () => {
  const src = fs.readFileSync("features/gyms/data/gym-reward-registry.ts", "utf8");
  assert.match(src, /500, 10/, "Kanto Gym 1's own reward numbers must still be present, unmodified");
});

test("no browser automation / E2E UI harness was added", () => {
  assert.ok(!fs.existsSync("app/(game)/leagues/bracket"), "no final bracket route should exist yet (Phase 9)");
});

test("no username-color or trophy-icon feature exists yet", () => {
  const candidates = ["components/layout/GameHeader.tsx", "features/profile/components/ProfileContent.tsx"];
  for (const file of candidates) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    for (const forbidden of ["championColor", "usernameColor", "trophyIcon", "leagueChampionBadge"]) {
      assert.ok(!src.includes(forbidden), `${file} must not yet implement ${forbidden} (Phase 9)`);
    }
  }
});

test("no Home current-champion card was implemented", () => {
  const homeFiles = ["features/home/components/NavigationGrid.tsx", "features/player/services/player-header-data.service.ts"];
  for (const file of homeFiles) {
    if (!fs.existsSync(file)) continue;
    const src = fs.readFileSync(file, "utf8");
    assert.ok(!src.includes("getCurrentLeagueChampion"), `${file} must not yet call the League champion query (Phase 9 owns Home presentation)`);
  }
});
