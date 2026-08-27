// POKÉMON DAYCARE — 5 SLOTS + 500 MONEY DEPOSIT FEE. Focused coverage for
// this task's own 18 numbered requirements (Section 11), plus a preserved
// section re-proving Phase 1's pure timing/cost/progression math is
// completely untouched (Section 9/10 of this task's own spec: "do NOT
// change" these). Behavioral checks run the real services against the
// in-memory fake DB — same convention every other persistence-layer test
// in this codebase already establishes; UI-wiring facts are checked at the
// source level.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test, beforeEach } from "node:test";

import {
  DAYCARE_DEPOSIT_FEE,
  DAYCARE_MAX_LEVELS_PER_STAY,
  DAYCARE_MAX_POKEMON_LEVEL,
  DAYCARE_MAX_SLOTS,
  DAYCARE_MS_PER_HOUR,
  getDaycareCostForNextLevel,
  getDaycareHoursForNextLevel,
} from "@/features/daycare/config/daycare.config";
import { calculateDaycareProgress } from "@/features/daycare/daycare-calculations";
import { collectFromDaycare, depositToDaycare } from "@/features/daycare/services/daycare.service";
import { getDaycareViewData } from "@/features/daycare/services/daycare-view.service";
import {
  getDaycareStayRow,
  getPlayerKnownMoveFindManyCallCount,
  getPlayerPokemonRow,
  getPlayerProfileRow,
  resetFakeDb,
  seedDaycareStay,
  seedKnownMove,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  seedPlayerPokemon,
  seedPlayerProfile,
} from "../../test/support/fakes/prisma.fake.ts";

const HOUR = DAYCARE_MS_PER_HOUR;

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "player-a", displayName: "אביב", coins: 10_000 });
  seedPlayerProfile({ id: "player-b", displayName: "נועה", coins: 10_000 });
});

// Deposits `count` fresh, eligible level-5 Pokémon for `playerId`,
// returning their ids — used by every multi-slot test below so filling N
// slots is one line instead of N repeated seed+deposit calls.
async function depositMany(playerId: string, count: number, idPrefix = "mon"): Promise<string[]> {
  const ids: string[] = [];
  for (let i = 0; i < count; i += 1) {
    const id = `${idPrefix}-${playerId}-${i}`;
    seedPlayerPokemon({ id, playerId, level: 5 });
    const result = await depositToDaycare(playerId, id);
    assert.equal(result.ok, true, `seed deposit ${id} must succeed`);
    ids.push(id);
  }
  return ids;
}

// ===========================================================================
// PRESERVED BEHAVIOR — timing/cost/progression math is completely
// unchanged by this task (Section 9/10 of the spec). Same assertions as
// the original Phase 1 suite.
// ===========================================================================

test("preserved: level 1 -> 2 takes 8 hours, level 10 -> 11 takes 12 hours", () => {
  assert.equal(getDaycareHoursForNextLevel(1), 8);
  assert.equal(getDaycareHoursForNextLevel(10), 12);
});

test("preserved: reaching level 10 costs 300, reaching level 11 costs 500", () => {
  assert.equal(getDaycareCostForNextLevel(9), 300);
  assert.equal(getDaycareCostForNextLevel(10), 500);
});

test("preserved: progression correctly crosses timing/cost brackets", () => {
  const depositedAt = new Date("2026-01-01T00:00:00.000Z");
  const now = new Date(depositedAt.getTime() + 8 * HOUR + 12 * HOUR);
  const progress = calculateDaycareProgress({ startingLevel: 9, depositedAt, now });
  assert.equal(progress.earnedLevels, 2);
  assert.equal(progress.effectiveLevel, 11);
  assert.equal(progress.debt, 300 + 500);
});

// ===========================================================================
// 1-4 — DEPOSIT FEE
// ===========================================================================

test("1: deposit costs exactly 500 Money, charged immediately", async () => {
  seedPlayerPokemon({ id: "mon-fee", playerId: "player-a", level: 5 });
  const before = getPlayerProfileRow("player-a")?.coins;
  const result = await depositToDaycare("player-a", "mon-fee");
  assert.equal(result.ok, true);
  assert.equal(getPlayerProfileRow("player-a")?.coins, (before ?? 0) - DAYCARE_DEPOSIT_FEE);
  assert.equal(DAYCARE_DEPOSIT_FEE, 500);
});

test("2: insufficient Money rejects deposit without charging anything", async () => {
  seedPlayerProfile({ id: "player-a", displayName: "אביב", coins: 300 });
  seedPlayerPokemon({ id: "mon-poor", playerId: "player-a", level: 5 });

  const result = await depositToDaycare("player-a", "mon-poor");
  assert.deepEqual(result, { ok: false, error: "insufficient-funds" });
  assert.equal(getPlayerProfileRow("player-a")?.coins, 300, "no Money may be deducted");
  assert.equal(getDaycareStayRow("mon-poor"), undefined, "no stay may be created");
});

test("3: a successful deposit charges the fee exactly once", async () => {
  seedPlayerPokemon({ id: "mon-once", playerId: "player-a", level: 5 });
  await depositToDaycare("player-a", "mon-once");
  assert.equal(getPlayerProfileRow("player-a")?.coins, 10_000 - DAYCARE_DEPOSIT_FEE);

  // A second deposit attempt for the SAME already-deposited Pokémon must
  // never charge again.
  const second = await depositToDaycare("player-a", "mon-once");
  assert.deepEqual(second, { ok: false, error: "already-in-daycare" });
  assert.equal(getPlayerProfileRow("player-a")?.coins, 10_000 - DAYCARE_DEPOSIT_FEE, "the fee must never be charged twice");
});

test("4: a deposit that fails after the fee would have been spent rolls the charge back — proven via the 5-slot cap", async () => {
  await depositMany("player-a", DAYCARE_MAX_SLOTS);
  const balanceAtCapacity = getPlayerProfileRow("player-a")?.coins;

  seedPlayerPokemon({ id: "mon-overflow", playerId: "player-a", level: 5 });
  const result = await depositToDaycare("player-a", "mon-overflow");
  assert.deepEqual(result, { ok: false, error: "daycare-full" });
  assert.equal(getPlayerProfileRow("player-a")?.coins, balanceAtCapacity, "a rejected deposit must never leave the fee deducted");
  assert.equal(getDaycareStayRow("mon-overflow"), undefined);
});

// ===========================================================================
// 5-8 — CAPACITY
// ===========================================================================

test("5: a player can deposit up to 5 Pokémon at once", async () => {
  const ids = await depositMany("player-a", DAYCARE_MAX_SLOTS);
  const view = await getDaycareViewData("player-a");
  assert.equal(view.activeStays.length, DAYCARE_MAX_SLOTS);
  assert.deepEqual(
    new Set(view.activeStays.map((stay) => stay.playerPokemonId)),
    new Set(ids)
  );
});

test("6: a sixth Pokémon is rejected once 5 are already deposited", async () => {
  await depositMany("player-a", DAYCARE_MAX_SLOTS);
  seedPlayerPokemon({ id: "mon-sixth", playerId: "player-a", level: 5 });

  const result = await depositToDaycare("player-a", "mon-sixth");
  assert.deepEqual(result, { ok: false, error: "daycare-full" });
  assert.equal(getDaycareStayRow("mon-sixth"), undefined);

  const view = await getDaycareViewData("player-a");
  assert.equal(view.activeStays.length, DAYCARE_MAX_SLOTS, "capacity must never exceed 5");
});

test("7: concurrent deposits for the same player can never exceed 5 active stays", async () => {
  await depositMany("player-a", DAYCARE_MAX_SLOTS - 1); // 4 active stays — one free slot
  seedPlayerPokemon({ id: "mon-race-1", playerId: "player-a", level: 5 });
  seedPlayerPokemon({ id: "mon-race-2", playerId: "player-a", level: 5 });

  const [resultA, resultB] = await Promise.all([
    depositToDaycare("player-a", "mon-race-1"),
    depositToDaycare("player-a", "mon-race-2"),
  ]);

  const successes = [resultA, resultB].filter((result) => result.ok).length;
  assert.equal(successes, 1, "exactly one of the two competing deposits for the last free slot must succeed");

  const view = await getDaycareViewData("player-a");
  assert.equal(view.activeStays.length, DAYCARE_MAX_SLOTS, "the final count must be exactly 5, never 6");
});

test("8: the same Pokémon cannot be deposited twice", async () => {
  seedPlayerPokemon({ id: "mon-dup", playerId: "player-a", level: 5 });
  const first = await depositToDaycare("player-a", "mon-dup");
  assert.equal(first.ok, true);

  const second = await depositToDaycare("player-a", "mon-dup");
  assert.deepEqual(second, { ok: false, error: "already-in-daycare" });
});

test("8b: concurrent duplicate-deposit requests for the SAME Pokémon still resolve to exactly one success", async () => {
  seedPlayerPokemon({ id: "mon-dup-race", playerId: "player-a", level: 5 });

  const [resultA, resultB] = await Promise.all([
    depositToDaycare("player-a", "mon-dup-race"),
    depositToDaycare("player-a", "mon-dup-race"),
  ]);

  const successes = [resultA, resultB].filter((result) => result.ok).length;
  assert.equal(successes, 1);
  assert.equal(getPlayerProfileRow("player-a")?.coins, 10_000 - DAYCARE_DEPOSIT_FEE, "the fee must only ever be charged once for one Pokémon");
});

// ===========================================================================
// 9-10 — INDEPENDENT PROGRESSION/DEBT
// ===========================================================================

test("9: each deposited Pokémon has its own independent depositedAt and progress", async () => {
  seedPlayerPokemon({ id: "mon-early", playerId: "player-a", level: 5 });
  seedDaycareStay({ playerPokemonId: "mon-early", playerId: "player-a", startingLevel: 5, depositedAt: new Date(Date.now() - 8 * HOUR - 60_000) });

  seedPlayerPokemon({ id: "mon-late", playerId: "player-a", level: 5 });
  seedDaycareStay({ playerPokemonId: "mon-late", playerId: "player-a", startingLevel: 5, depositedAt: new Date(Date.now() - 60_000) });

  const view = await getDaycareViewData("player-a");
  const early = view.activeStays.find((stay) => stay.playerPokemonId === "mon-early");
  const late = view.activeStays.find((stay) => stay.playerPokemonId === "mon-late");

  assert.equal(early?.earnedLevels, 1, "the long-deposited Pokémon must have earned a level");
  assert.equal(late?.earnedLevels, 0, "the just-deposited Pokémon must not have earned anything yet");
  assert.notEqual(early?.depositedAt, late?.depositedAt);
});

test("10: each deposited Pokémon has its own independent debt", async () => {
  seedPlayerPokemon({ id: "mon-debt-a", playerId: "player-a", level: 5 });
  seedDaycareStay({ playerPokemonId: "mon-debt-a", playerId: "player-a", startingLevel: 5, depositedAt: new Date(Date.now() - 2 * 8 * HOUR - 60_000) });

  seedPlayerPokemon({ id: "mon-debt-b", playerId: "player-a", level: 20 });
  seedDaycareStay({ playerPokemonId: "mon-debt-b", playerId: "player-a", startingLevel: 20, depositedAt: new Date(Date.now() - 12 * HOUR - 60_000) });

  const view = await getDaycareViewData("player-a");
  const a = view.activeStays.find((stay) => stay.playerPokemonId === "mon-debt-a");
  const b = view.activeStays.find((stay) => stay.playerPokemonId === "mon-debt-b");

  assert.equal(a?.debt, 300 * 2, "two earned levels at 1-10 = 600");
  assert.equal(b?.debt, 500, "one earned level at 11-25 = 500");
  assert.notEqual(a?.debt, b?.debt);
});

// ===========================================================================
// 11-13 — PICKUP (per Pokémon)
// ===========================================================================

test("11: collecting one deposited Pokémon does not affect the other four", async () => {
  const ids = await depositMany("player-a", DAYCARE_MAX_SLOTS);
  // Age every stay so each has earned at least one level.
  for (const id of ids) {
    seedDaycareStay({ playerPokemonId: id, playerId: "player-a", startingLevel: 5, depositedAt: new Date(Date.now() - 8 * HOUR - 60_000) });
  }

  const [collectedId, ...remaining] = ids;
  const result = await collectFromDaycare("player-a", collectedId);
  assert.equal(result.ok, true);

  assert.equal(getDaycareStayRow(collectedId), undefined, "the collected Pokémon's own stay must be gone");
  for (const id of remaining) {
    assert.notEqual(getDaycareStayRow(id), undefined, `${id}'s stay must be completely untouched`);
  }

  const view = await getDaycareViewData("player-a");
  assert.equal(view.activeStays.length, DAYCARE_MAX_SLOTS - 1);
});

test("12: collecting a Pokémon never refunds the original 500 deposit fee", async () => {
  seedPlayerPokemon({ id: "mon-no-refund", playerId: "player-a", level: 5 });
  await depositToDaycare("player-a", "mon-no-refund");
  const balanceAfterDeposit = getPlayerProfileRow("player-a")?.coins;
  assert.equal(balanceAfterDeposit, 10_000 - DAYCARE_DEPOSIT_FEE);

  // Collect immediately — zero earned levels, zero level debt.
  const result = await collectFromDaycare("player-a", "mon-no-refund");
  assert.equal(result.ok, true);
  if (result.ok) assert.equal(result.moneySpent, 0, "zero levels earned means zero level-debt charged at pickup");

  assert.equal(
    getPlayerProfileRow("player-a")?.coins,
    balanceAfterDeposit,
    "pickup must never add the 500 deposit fee back — it was already spent, permanently, at deposit time"
  );
});

test("13: after collecting one from a full 5/5 Daycare, capacity becomes 4/5 and another Pokémon can be deposited", async () => {
  const ids = await depositMany("player-a", DAYCARE_MAX_SLOTS);

  const collected = await collectFromDaycare("player-a", ids[0]);
  assert.equal(collected.ok, true);

  const afterCollect = await getDaycareViewData("player-a");
  assert.equal(afterCollect.activeStays.length, DAYCARE_MAX_SLOTS - 1);

  seedPlayerPokemon({ id: "mon-new-after-collect", playerId: "player-a", level: 5 });
  const deposit = await depositToDaycare("player-a", "mon-new-after-collect");
  assert.equal(deposit.ok, true, "a freed slot must accept a new deposit");

  const finalView = await getDaycareViewData("player-a");
  assert.equal(finalView.activeStays.length, DAYCARE_MAX_SLOTS);
});

// ===========================================================================
// 14-15 — UI
// ===========================================================================

test("14: (source + behavioral) the UI displays 'X/5' deposited-Pokémon capacity", async () => {
  const contentSrc = fs.readFileSync("features/daycare/components/DaycareContent.tsx", "utf8");
  assert.match(contentSrc, /פוקימונים במעון: \{data\.activeStays\.length\}\/\{DAYCARE_MAX_SLOTS\}/);

  await depositMany("player-a", 2);
  const view = await getDaycareViewData("player-a");
  assert.equal(view.activeStays.length, 2, "the view data driving that X/5 text must reflect exactly 2 active stays");
});

test("15: (source) the UI clearly displays the 500 Money deposit fee, both in the selector banner and on each deposit button", () => {
  const contentSrc = fs.readFileSync("features/daycare/components/DaycareContent.tsx", "utf8");
  assert.match(contentSrc, /דמי כניסה למעון: \{DAYCARE_DEPOSIT_FEE/);

  const cardSrc = fs.readFileSync("features/daycare/components/DaycareEligiblePokemonCard.tsx", "utf8");
  assert.match(cardSrc, /דמי כניסה: \{DAYCARE_DEPOSIT_FEE/);

  assert.match(contentSrc, /המעון מלא — ניתן להחזיק עד \$\{DAYCARE_MAX_SLOTS\} פוקימונים במעון/, "the full-capacity message must use the real config constant, not a hardcoded 5");
});

// ===========================================================================
// 16-18 — EXISTING RULES STILL WORK
// ===========================================================================

test("16: the existing 10-level-per-stay cap still applies to every individual stay", async () => {
  seedPlayerPokemon({ id: "mon-cap10", playerId: "player-a", level: 1 });
  seedDaycareStay({ playerPokemonId: "mon-cap10", playerId: "player-a", startingLevel: 1, depositedAt: new Date(Date.now() - 10_000 * HOUR) });

  const view = await getDaycareViewData("player-a");
  const stay = view.activeStays.find((s) => s.playerPokemonId === "mon-cap10");
  assert.equal(stay?.earnedLevels, DAYCARE_MAX_LEVELS_PER_STAY);
  assert.equal(stay?.progressionStopped, true);
  assert.equal(stay?.stoppedReason, "levelCap");
});

test("17: the existing level-100 cap still applies", async () => {
  seedPlayerPokemon({ id: "mon-cap100", playerId: "player-a", level: 95 });
  seedDaycareStay({ playerPokemonId: "mon-cap100", playerId: "player-a", startingLevel: 95, depositedAt: new Date(Date.now() - 100_000 * HOUR) });

  const view = await getDaycareViewData("player-a");
  const stay = view.activeStays.find((s) => s.playerPokemonId === "mon-cap100");
  assert.equal(stay?.effectiveLevel, DAYCARE_MAX_POKEMON_LEVEL);
  assert.equal(stay?.stoppedReason, "maxLevel");
});

test("18: the existing exactly-once pickup protection still works, per Pokémon", async () => {
  seedPlayerPokemon({ id: "mon-exactly-once", playerId: "player-a", level: 5, speciesId: "charmander", experience: 0 });
  seedKnownMove({ playerPokemonId: "mon-exactly-once", moveId: "scratch", slot: 1 });
  seedDaycareStay({ playerPokemonId: "mon-exactly-once", playerId: "player-a", startingLevel: 5, depositedAt: new Date(Date.now() - 5 * 8 * HOUR - 60_000) });

  const first = await collectFromDaycare("player-a", "mon-exactly-once");
  assert.equal(first.ok, true);
  assert.equal(getPlayerPokemonRow("mon-exactly-once")?.level, 10);
  const balanceAfterFirst = getPlayerProfileRow("player-a")?.coins;

  const second = await collectFromDaycare("player-a", "mon-exactly-once");
  assert.deepEqual(second, { ok: false, error: "not-found" });
  assert.equal(getPlayerPokemonRow("mon-exactly-once")?.level, 10, "a duplicate pickup must never apply levels twice");
  assert.equal(getPlayerProfileRow("player-a")?.coins, balanceAfterFirst, "a duplicate pickup must never charge twice");
});

test("18b: move-learning and pending-evolution creation (existing behavior) are unaffected by the multi-slot change", async () => {
  seedPlayerProfile({ id: "player-a", displayName: "אביב", coins: 100_000 });
  seedPlayerPokemon({ id: "mon-evolve", playerId: "player-a", level: 12, speciesId: "charmander", experience: 0 });
  seedDaycareStay({ playerPokemonId: "mon-evolve", playerId: "player-a", startingLevel: 12, depositedAt: new Date(Date.now() - 10_000 * HOUR) });

  assert.equal(getPlayerKnownMoveFindManyCallCount(), 0);
  const result = await collectFromDaycare("player-a", "mon-evolve");
  assert.equal(result.ok, true);
  assert.ok(getPlayerKnownMoveFindManyCallCount() > 0, "move-learning must still run across the full earned level span");

  const pokemon = getPlayerPokemonRow("mon-evolve");
  assert.equal(pokemon?.speciesId, "charmander", "no automatic evolution");
  assert.equal(pokemon?.pendingEvolutionSpeciesId, "charmeleon", "a pending evolution decision must still be created");
});

// ===========================================================================
// SINGLE SOURCE OF TRUTH — DAYCARE_DEPOSIT_FEE (500) is never duplicated as
// a second hardcoded literal. DAYCARE_MAX_SLOTS (5) is deliberately NOT
// substring-checked here — a bare "5" collides constantly with ordinary
// Tailwind classes/spacing values (p-5, gap-5, h-5, ...) and would be a
// blanket-substring false-positive trap; its correct wiring is instead
// proven behaviorally above (tests 5-7, 13) and at the source level (test
// 14's exact `DAYCARE_MAX_SLOTS` identifier match).
// ===========================================================================

// Strips `//` line-comments before checking — a doc comment legitimately
// discussing "the 500 deposit fee" in prose (as several files in this
// feature do) must never false-positive a check meant to catch that
// number hardcoded in real, executable code.
function stripLineComments(src: string): string {
  return src
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
}

function assertNoHardcodedNumberLiteral(src: string, literals: string[], label: string): void {
  const code = stripLineComments(src);
  for (const literal of literals) {
    const pattern = new RegExp(`(?<![-\\d])${literal}(?!\\d)`);
    assert.ok(!pattern.test(code), `${label} must never hardcode ${literal} as a real number literal — it must always come from daycare.config.ts`);
  }
}

// ===========================================================================
// MARKETPLACE PHASE 7 (hardening) — a Pokémon locked into a listing must
// never be deposited.
// ===========================================================================

test("MARKETPLACE PHASE 7 — a Pokémon currently locked into a listing is rejected, and no fee is charged", async () => {
  seedPlayerPokemon({ id: "listed", playerId: "player-a", level: 5 });
  const listing = seedMarketplaceListing({ sellerId: "player-a" });
  seedMarketplaceListingPokemon({ playerPokemonId: "listed", listingId: listing.id });

  const before = getPlayerProfileRow("player-a")!.coins;
  const result = await depositToDaycare("player-a", "listed");

  assert.deepEqual(result, { ok: false, error: "marketplace-listed" });
  assert.equal(getPlayerProfileRow("player-a")!.coins, before, "the deposit fee must never be charged for a rejected deposit");
  assert.equal(getDaycareStayRow("listed"), undefined);
});

test("SSOT: no file outside daycare.config.ts hardcodes 500 (the deposit fee) a second time", () => {
  const files = [
    "features/daycare/services/daycare.service.ts",
    "features/daycare/services/daycare-view.service.ts",
    "features/daycare/components/DaycareContent.tsx",
    "features/daycare/components/DaycareActiveStayPanel.tsx",
    "features/daycare/components/DaycareEligiblePokemonCard.tsx",
  ];
  for (const file of files) {
    const src = fs.readFileSync(file, "utf8");
    assertNoHardcodedNumberLiteral(src, ["500"], file);
  }
});
