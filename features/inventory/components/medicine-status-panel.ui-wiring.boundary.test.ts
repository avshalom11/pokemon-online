// STATUS-HEALING ITEMS — source-read boundary coverage for the Inventory
// wiring, same technique as region-travel-cost.ui-wiring.boundary.test.ts:
// InventoryContent.tsx and MedicineStatusPanel.tsx are both Client
// Components, not importable directly under this project's plain node:test
// runner. The actual candidate-selection logic itself is covered for real
// in medicine-status-eligibility.test.ts (pure) and
// use-medicine.service.status.test.ts (server) — this file only pins the
// wiring/rendering shape.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const inventoryContentSrc = readSourceNormalized("features/inventory/components/InventoryContent.tsx");
const panelSrc = readSourceNormalized("features/inventory/components/MedicineStatusPanel.tsx");

test("MedicineStatusPanel is rendered only for a selected 'potions' item whose medicineEffectKind is 'cure-status' — never for plain heal/revive Potions", () => {
  assert.ok(inventoryContentSrc.includes('import { MedicineStatusPanel } from "@/features/inventory/components/MedicineStatusPanel";'));
  assert.ok(inventoryContentSrc.includes('selectedView.item.categoryId === "potions"'));
  assert.ok(inventoryContentSrc.includes('selectedView.item.medicineEffectKind === "cure-status"'));
  assert.ok(inventoryContentSrc.includes("<MedicineStatusPanel key={selectedView.item.id} item={selectedView.item} ownedPokemon={ownedPokemon} />"));
});

test("MedicineStatusPanel receives the SAME ownedPokemon prop (party AND storage) InventoryContent already threads into EvolutionItemPanel — no separate/duplicated data source", () => {
  assert.ok(inventoryContentSrc.includes("<EvolutionItemPanel item={selectedView.item} ownedPokemon={ownedPokemon} />"));
  assert.ok(inventoryContentSrc.includes("<MedicineStatusPanel key={selectedView.item.id} item={selectedView.item} ownedPokemon={ownedPokemon} />"));
});

test("candidates are derived via the pure getMedicineStatusCandidates filter, never a hardcoded/duplicated eligibility check inside the panel", () => {
  assert.ok(panelSrc.includes('import { getMedicineStatusCandidates, type MedicineStatusCandidate } from "@/features/battle/services/medicine-status-eligibility";'));
  assert.ok(panelSrc.includes("const candidates = getMedicineStatusCandidates(item, ownedPokemon);"));
});

test("a clean informational empty state is shown when there are no eligible Pokémon — never a silently-broken/empty grid", () => {
  assert.ok(panelSrc.includes("candidates.length === 0"));
  assert.ok(panelSrc.includes("NO_ELIGIBLE_MESSAGE"));
});

test("each candidate tile shows its current MajorStatus label — the required 'why is this Pokémon eligible' cue", () => {
  assert.ok(panelSrc.includes('import { MAJOR_STATUS_LABELS } from "@/features/battle/status/major-status-labels";'));
  assert.ok(panelSrc.includes("MAJOR_STATUS_LABELS[candidate.status]"));
});

test("confirming a use calls useStatusMedicineItemAction — the same server-side applyMedicineItemUse the battle Bag uses, never a parallel cure implementation", () => {
  assert.ok(panelSrc.includes('import { useStatusMedicineItemAction } from "@/features/inventory/actions/use-status-medicine-item.action";'));
  assert.ok(panelSrc.includes("await useStatusMedicineItemAction(item.id, selectedCandidate.playerPokemonId)"));
});

test("cancelling the confirm dialog never fires a server call — onCancel is a plain local state reset", () => {
  const handleCancelBody = panelSrc.slice(panelSrc.indexOf("function handleCancel"), panelSrc.indexOf("function handleConfirm"));
  assert.ok(!handleCancelBody.includes("useStatusMedicineItemAction"));
});
