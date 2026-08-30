// Focused regression tests for the battle Bag's per-(item, Pokémon)
// medicine eligibility rule — pure, no DB, no React.
import assert from "node:assert/strict";
import { test } from "node:test";

import { isMedicineTargetEligible } from "./medicine-target-eligibility.ts";
import { getSpeciesById } from "@/features/pokemon/services/species-catalog";
import type { OwnedPokemon } from "@/shared/types/player-pokemon";
import type { ShopItem } from "@/features/shop/types/shop.types";

function makeOwned(id: string, overrides: Partial<OwnedPokemon> = {}): OwnedPokemon {
  const species = getSpeciesById("charmander");
  if (!species) throw new Error("unknown species in test fixture");

  return {
    id,
    species,
    nickname: null,
    level: 20,
    experience: 0,
    currentHp: 30,
    maxHp: 30,
    isStarter: false,
    caughtAt: new Date(),
    isShiny: false,
    partySlot: 1,
    status: null,
    statusTurnsRemaining: null,
    ...overrides,
  };
}

function makeItem(overrides: Partial<ShopItem>): ShopItem {
  return {
    id: "test-item",
    categoryId: "potions",
    name: "Test Item",
    price: 100,
    currency: "money",
    description: "",
    imageUrl: "",
    ...overrides,
  };
}

const POTION = makeItem({ id: "potion", medicineEffectKind: "heal", healPercent: 0.2 });
const REVIVE = makeItem({ id: "revive", medicineEffectKind: "revive", healPercent: 0.5 });
const ANTIDOTE = makeItem({ id: "antidote", medicineEffectKind: "cure-status", curesStatus: "poison" });
const FULL_HEAL = makeItem({ id: "full-heal", medicineEffectKind: "cure-status", curesStatus: "all" });

test("plain heal (Potion): eligible only when NOT fainted, regardless of status", () => {
  assert.equal(isMedicineTargetEligible(POTION, makeOwned("a", { currentHp: 10 })), true);
  assert.equal(isMedicineTargetEligible(POTION, makeOwned("a", { currentHp: 0 })), false);
  assert.equal(isMedicineTargetEligible(POTION, makeOwned("a", { currentHp: 10, status: "poison" })), true);
});

test("Revive: eligible only when fainted", () => {
  assert.equal(isMedicineTargetEligible(REVIVE, makeOwned("a", { currentHp: 0 })), true);
  assert.equal(isMedicineTargetEligible(REVIVE, makeOwned("a", { currentHp: 1 })), false);
});

test("Antidote: eligible only for a non-fainted Pokémon whose current status is exactly poison", () => {
  assert.equal(isMedicineTargetEligible(ANTIDOTE, makeOwned("a", { status: "poison" })), true);
  assert.equal(isMedicineTargetEligible(ANTIDOTE, makeOwned("a", { status: "burn" })), false, "wrong status must be excluded");
  assert.equal(isMedicineTargetEligible(ANTIDOTE, makeOwned("a", { status: null })), false, "healthy target must be excluded");
  assert.equal(isMedicineTargetEligible(ANTIDOTE, makeOwned("a", { status: "poison", currentHp: 0 })), false, "fainted target must be excluded");
});

test("Full Heal: eligible for a non-fainted Pokémon with ANY MajorStatus", () => {
  for (const status of ["poison", "burn", "paralysis", "sleep", "freeze"] as const) {
    assert.equal(isMedicineTargetEligible(FULL_HEAL, makeOwned("a", { status })), true, `${status} must qualify for Full Heal`);
  }
  assert.equal(isMedicineTargetEligible(FULL_HEAL, makeOwned("a", { status: null })), false, "healthy target must be excluded");
  assert.equal(isMedicineTargetEligible(FULL_HEAL, makeOwned("a", { status: "poison", currentHp: 0 })), false, "fainted target must be excluded");
});
