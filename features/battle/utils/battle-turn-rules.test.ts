// FIELD BATTLE STALE-HP / FORCED-REPLACEMENT FIX — focused coverage for the
// pure decision primitives this fix reuses (never a second, parallel
// implementation): determineNextPhaseAfterFaint is the one place BOTH the
// already-working success path (BattleContent's handleAttack/
// resolveCounterAttackAgainstActive) AND the new resync path
// (resyncAfterUncertainAttackOutcome) decide "forced replacement or party
// defeated" — see BattleContent.forced-replacement-resync.test.ts for the
// wiring itself.
import assert from "node:assert/strict";
import { test } from "node:test";

import { determineNextPhaseAfterFaint, resolveWildCounterAttack } from "./battle-turn-rules.ts";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";

// Same fixture-building convention features/evolution/services/
// evolution-item-eligibility.test.ts already establishes for a real,
// catalog-backed OwnedPokemon — never a hand-faked species object.
function fakePartyMember(id: string, currentHp: number, overrides: Partial<OwnedPokemon> = {}): OwnedPokemon {
  const species = getSpeciesById("pikachu");
  if (!species) throw new Error("unknown species in test fixture: pikachu");

  return {
    id,
    species,
    nickname: null,
    level: 10,
    experience: 0,
    currentHp,
    maxHp: 100,
    isStarter: false,
    caughtAt: new Date(),
    isShiny: false,
    partySlot: 1,
    status: null,
    statusTurnsRemaining: null,
    ...overrides,
  };
}

test("determineNextPhaseAfterFaint: at least one other usable party member -> selectingForcedReplacement (scenario A/B/C decision half)", () => {
  const party = [fakePartyMember("fainted", 0), fakePartyMember("bench-1", 40)];
  assert.equal(determineNextPhaseAfterFaint(party), "selectingForcedReplacement");
});

test("determineNextPhaseAfterFaint: every party member at 0 HP -> partyDefeated (scenario D)", () => {
  const party = [fakePartyMember("fainted-1", 0), fakePartyMember("fainted-2", 0)];
  assert.equal(determineNextPhaseAfterFaint(party), "partyDefeated");
});

test("determineNextPhaseAfterFaint: a single-member party at 0 HP -> partyDefeated", () => {
  assert.equal(determineNextPhaseAfterFaint([fakePartyMember("only", 0)]), "partyDefeated");
});

test("determineNextPhaseAfterFaint: fainted is strictly HP <= 0, never a positive-but-low HP", () => {
  // Guards against ever reintroducing a minimum-HP floor/clamp — a party
  // member showing 1 HP must still count as usable here.
  const party = [fakePartyMember("fainted", 0), fakePartyMember("barely-alive", 1)];
  assert.equal(determineNextPhaseAfterFaint(party), "selectingForcedReplacement");
});

test("resolveWildCounterAttack: fainted is derived from the same newHp it returns, never disagreeing with it", () => {
  const highHp = resolveWildCounterAttack(1000);
  assert.equal(highHp.fainted, highHp.newHp <= 0);

  const lowHp = resolveWildCounterAttack(1);
  assert.equal(lowHp.fainted, lowHp.newHp <= 0);
});
