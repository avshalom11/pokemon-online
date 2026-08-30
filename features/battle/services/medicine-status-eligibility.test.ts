// Focused regression tests for the Inventory's status-medicine candidate
// filter — pure, no DB, no React (mirrors evolution-item-eligibility.test.ts
// exactly).
import assert from "node:assert/strict";
import { test } from "node:test";

import { getMedicineStatusCandidates } from "./medicine-status-eligibility.ts";
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
    partySlot: null,
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
    price: 500,
    currency: "money",
    description: "",
    imageUrl: "",
    ...overrides,
  };
}

const ANTIDOTE = makeItem({ id: "antidote", medicineEffectKind: "cure-status", curesStatus: "poison" });
const FULL_HEAL = makeItem({ id: "full-heal", medicineEffectKind: "cure-status", curesStatus: "all" });
const POTION = makeItem({ id: "potion", medicineEffectKind: "heal", healPercent: 0.2 });

test("active-party AND storage Pokémon with the matching status are both returned", () => {
  const owned = [
    makeOwned("mon-party", { partySlot: 1, status: "poison" }),
    makeOwned("mon-storage", { partySlot: null, status: "poison" }),
  ];

  const candidates = getMedicineStatusCandidates(ANTIDOTE, owned);
  const ids = candidates.map((c) => c.playerPokemonId).sort();

  assert.deepEqual(ids, ["mon-party", "mon-storage"]);
});

test("a Pokémon with a DIFFERENT status than the item cures is excluded", () => {
  const owned = [makeOwned("mon-burned", { status: "burn" })];
  assert.deepEqual(getMedicineStatusCandidates(ANTIDOTE, owned), []);
});

test("a healthy (no status) Pokémon is excluded", () => {
  const owned = [makeOwned("mon-healthy", { status: null })];
  assert.deepEqual(getMedicineStatusCandidates(ANTIDOTE, owned), []);
});

test("a fainted Pokémon is excluded even if it carries the matching status", () => {
  const owned = [makeOwned("mon-fainted", { status: "poison", currentHp: 0 })];
  assert.deepEqual(getMedicineStatusCandidates(ANTIDOTE, owned), []);
});

test("Full Heal returns a Pokémon with ANY of the 5 MajorStatus values", () => {
  const owned = (["poison", "burn", "paralysis", "sleep", "freeze"] as const).map((status, i) =>
    makeOwned(`mon-${i}`, { status })
  );

  const candidates = getMedicineStatusCandidates(FULL_HEAL, owned);
  assert.equal(candidates.length, 5);
});

test("a plain heal/revive item (not cure-status) always returns an empty list — this filter is status-cure-only", () => {
  const owned = [makeOwned("mon-poisoned", { status: "poison" })];
  assert.deepEqual(getMedicineStatusCandidates(POTION, owned), []);
});

test("each returned candidate carries the exact status it was matched on (for display)", () => {
  const owned = [makeOwned("mon-a", { status: "poison" })];
  const [candidate] = getMedicineStatusCandidates(ANTIDOTE, owned);
  assert.equal(candidate?.status, "poison");
});
