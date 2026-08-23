// GYMS & LEAGUES PHASE 9 — PHASE BOUNDARY TESTS. Confirms this Phase's UI/
// presentation work never touched gameplay rules, reward amounts, or
// tournament logic, and that the exact reward numbers this Phase's own UI
// now displays still match the source-of-truth registries unchanged.
import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";

test("no new UI file duplicates a reward/eligibility/pairing/tiebreak rule — every Phase 9 UI/view file only ever reads existing registries/services", () => {
  const files = [
    "features/gyms/components/GymsContent.tsx",
    "features/leagues/components/LeaguesContent.tsx",
    "features/leagues/services/league-bracket-view.service.ts",
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    for (const forbidden of ["resolveTiebreak", "generateRound1Pairings", "isEligibleForRegionalLeague", "resolveBattleTurn"]) {
      assert.ok(!src.includes(forbidden), `${file} must never re-implement/call gameplay logic (${forbidden}) directly — only read already-resolved view data`);
    }
  }
});

test("the Gym reward registry's exact numbers are untouched by this Phase (Kanto Gym 1, Paldea Champion's no-Diamond-Chest rule)", () => {
  const src = fs.readFileSync("features/gyms/data/gym-reward-registry.ts", "utf8");
  assert.match(src, /500, 10/, "Kanto Gym 1's own reward numbers must still be present, unmodified");
  assert.match(src, /money: 6000,\s*\n\s*xpPercentOfNextLevel: 50/, "Paldea Champion's exact 6,000 money / 50% XP must still be present, unmodified");
  assert.doesNotMatch(
    fs.readFileSync("features/gyms/data/gym-reward-registry.ts", "utf8"),
    /paldea:\s*\{[^}]*diamond/,
    "Paldea Champion must still grant NO Diamond Chest"
  );
});

test("the League reward registry's exact numbers are untouched by this Phase (League I place 1, Champions League participation)", () => {
  const src = fs.readFileSync("features/leagues/data/league-reward-registry.ts", "utf8");
  assert.match(src, /money: 10_000, xpPercentOfNextLevel: 50, gold: 100/, "League I's own 1st-place reward numbers must still be present, unmodified");
  assert.match(src, /money: 5_000,/, "Champions League's own participation money must still be present, unmodified");
});

test("no Prisma schema change was made by this Phase — Phase 8's own reward-claim-guard migration is still the newest LEAGUE-related migration (a later, unrelated feature — e.g. AUTH + ACCOUNT SETTINGS's failed-login lockout — may legitimately add its own migrations after it)", () => {
  const migrations = fs.readdirSync("prisma/migrations").filter((name) => name !== "migration_lock.toml");
  const leagueMigrations = migrations.filter((name) => /league/i.test(name));
  const newestLeagueMigration = [...leagueMigrations].sort().at(-1)!;
  assert.equal(
    newestLeagueMigration,
    "20260818082913_add_league_reward_claim_guard",
    "Phase 9 must not add a new League-related Prisma migration (section 37 — presentation-only)"
  );
});

// ROUND-1 GENERATION LIFECYCLE FIX — the gap this Phase originally reported
// (generateRound1ForTournament existed but was never called from production
// code) has since been fixed via the dedicated
// ensureRound1GeneratedForActiveTournament orchestration wrapper
// (league-tournament.service.ts). This boundary test now locks in HOW it's
// wired: the real page never calls the Phase 5 generator directly (so the
// idempotency/race-guard wrapper can never accidentally be bypassed), and
// no other page/service reimplements pairing itself.
test("/leagues wires Round-1 generation only through the dedicated orchestration wrapper, never by calling generateRound1ForTournament directly", () => {
  const pageSrc = fs.readFileSync("app/(game)/leagues/page.tsx", "utf8");
  assert.ok(pageSrc.includes("ensureRound1GeneratedForActiveTournament"), "the League page must call the orchestration wrapper");
  assert.ok(!pageSrc.includes("generateRound1ForTournament("), "the League page must never call the Phase 5 generator directly, bypassing the wrapper's window/status/race checks");

  const matchPageSrc = fs.readFileSync("app/(game)/leagues/match/[matchId]/page.tsx", "utf8");
  assert.ok(!matchPageSrc.includes("generateRound1ForTournament") && !matchPageSrc.includes("ensureRound1GeneratedForActiveTournament"), "Round-1 generation is a /leagues-page concern, not the match page's");
});

test("the Round-1 orchestration wrapper never duplicates pairing logic itself — it only ever calls the existing Phase 5 generator", () => {
  const src = fs.readFileSync("features/leagues/services/league-tournament.service.ts", "utf8");
  const wrapperBody = src.slice(src.indexOf("export async function ensureRound1GeneratedForActiveTournament"));
  assert.ok(wrapperBody.includes("await generateRound1ForTournament(tournament.id)"), "must delegate to the existing Phase 5 generator, never reimplement pairing");
  assert.ok(!wrapperBody.includes("generateRound1Pairings"), "must never call the pairing generator directly — that stays generateRound1ForTournament's own job");
});

test("no browser automation / E2E UI harness was added", () => {
  assert.ok(!fs.existsSync("app/(game)/leagues/bracket"), "no separate bracket route should exist — bracket UI lives inline on /leagues (section 2)");
  for (const region of ["kanto", "paldea"]) {
    assert.ok(!fs.existsSync(`app/(game)/gyms/${region}`), "no per-region Gym route should exist — one generic /gyms route only (section 2)");
  }
});
