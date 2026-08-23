// REGION TRAVEL COST — action/UI wiring coverage via source reads, same
// technique as this codebase's other Server Action / Client Component
// boundary tests (e.g. account-deletion.ui-wiring.boundary.test.ts):
// select-region.action.ts pulls in next/headers-dependent session helpers
// and WorldContent.tsx is a Client Component, neither importable directly
// under this project's plain node:test runner.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

function readSourceNormalized(path: string): string {
  return fs.readFileSync(path, "utf8").replace(/\r\n/g, "\n");
}

const actionSrc = readSourceNormalized("features/regions/actions/select-region.action.ts");
const worldContentSrc = readSourceNormalized("features/regions/components/WorldContent.tsx");
const dialogSrc = readSourceNormalized("features/regions/components/TravelConfirmDialog.tsx");
const regionCardSrc = readSourceNormalized("features/regions/components/RegionCard.tsx");
const worldPageSrc = readSourceNormalized("app/(game)/world/page.tsx");
const regionRegistrySrc = readSourceNormalized("features/regions/data/region-registry.ts");
const starterMediaPathsSrc = readSourceNormalized("features/regions/media/region-starter-media-paths.ts");

test("selectRegionAction's only client-supplied input is the destination regionId — never a price", () => {
  assert.ok(actionSrc.includes("export async function selectRegionAction(regionId: string): Promise<SelectRegionActionResult> {"));
  assert.ok(
    actionSrc.includes("await travelToRegion(profile.id, regionId)"),
    "travelToRegion must only ever be called with (playerId, regionId) — never a third, caller-suppliable price argument"
  );
});

test("the exact required Hebrew insufficient-funds message is used", () => {
  assert.ok(actionSrc.includes('const INSUFFICIENT_FUNDS_MESSAGE = "אין לך מספיק כסף כדי לעבור למחוז הזה.";'));
  assert.ok(actionSrc.includes("return { status: \"error\", message: INSUFFICIENT_FUNDS_MESSAGE };"));
});

test("clicking a DIFFERENT region only opens the confirm dialog — selectRegionAction is only ever called from handleConfirmTravel, never from the card's own onSelect", () => {
  const handleCardClickBody = worldContentSrc.slice(
    worldContentSrc.indexOf("function handleCardClick"),
    worldContentSrc.indexOf("function handleConfirmTravel")
  );
  assert.ok(!handleCardClickBody.includes("selectRegionAction"), "the card click handler itself must never call selectRegionAction directly");
  assert.ok(handleCardClickBody.includes("setPendingTravelRegionId(regionId)"));

  const handleConfirmBody = worldContentSrc.slice(worldContentSrc.indexOf("function handleConfirmTravel"));
  assert.ok(handleConfirmBody.includes("await selectRegionAction(regionId)"));
});

test("the region card's own onSelect is wired to handleCardClick, not directly to travel", () => {
  assert.ok(worldContentSrc.includes("onSelect={() => handleCardClick(region.id)}"));
});

test("Cancel in the confirm dialog only ever closes it — no server action is reachable from onCancel", () => {
  assert.ok(dialogSrc.includes("onClick={onCancel}"));
  assert.ok(
    !dialogSrc.includes('import { selectRegionAction }'),
    "the dialog component itself must never import the Server Action directly — only reach it via the parent's onConfirm callback"
  );
  assert.ok(worldContentSrc.includes("onCancel={() => setPendingTravelRegionId(null)}"));
});

// SIDEBAR REGIONS — SHOW TRAVEL COST
test('the World page section title reads "מחוזות", not the old "עולם"', () => {
  assert.ok(worldContentSrc.includes('<h1 className="text-lg font-bold text-slate-100">מחוזות</h1>'));
  assert.ok(!worldContentSrc.includes(">עולם<"), "the old title text must not remain anywhere in the heading");
});

test("each region card shows its travel cost, resolved from the same central config as the real charge — never a second hardcoded price list", () => {
  assert.ok(worldPageSrc.includes('import { getRegionTravelCost } from "@/features/regions/config/region-travel-cost.config";'));
  assert.ok(worldPageSrc.includes("travelCost: getRegionTravelCost(id)"));
  assert.ok(regionCardSrc.includes('import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";'));
  assert.ok(regionCardSrc.includes('<CurrencyIcon type="money"'));
  assert.ok(regionCardSrc.includes("{travelCost.toLocaleString(\"he-IL\")} כסף"));
});

test("the cost line renders directly under the region name, as smaller secondary text — the name stays the primary text", () => {
  const nameIndex = regionCardSrc.indexOf('<span className="text-sm font-semibold">{hebrewName}</span>');
  const costIndex = regionCardSrc.indexOf('<CurrencyIcon type="money"');
  assert.ok(nameIndex > -1 && costIndex > -1);
  assert.ok(nameIndex < costIndex, "the region name must appear before (visually above) the cost line");
  assert.ok(regionCardSrc.includes('className="flex items-center gap-1 text-xs text-slate-400"'), "the cost line must use a smaller/muted style than the name");
});

test("region travel cost is read only from the shared region-travel-cost.config.ts — no second price list is defined in the world page or the card", () => {
  assert.ok(!/:\s*(200|300|400|500|600|700|800|900|1000)\b/.test(worldPageSrc));
  assert.ok(!/:\s*(200|300|400|500|600|700|800|900|1000)\b/.test(regionCardSrc));
});

// REGION CARD IMAGES — PER-REGION STARTER ARTWORK
test("every region in the registry points to its own starter image path, resolved via the shared media-path helper (no shared placeholder, no hardcoded path per region)", () => {
  assert.ok(starterMediaPathsSrc.includes('const REGION_STARTER_IMAGE_ROOT = "/images/regions/starters";'));
  assert.ok(starterMediaPathsSrc.includes("return `${REGION_STARTER_IMAGE_ROOT}/${regionId}.png`;"));
  assert.ok(!regionRegistrySrc.includes("DEFAULT_CARD_IMAGE_SRC"), "the old shared placeholder constant must be fully removed");

  for (const regionId of ["kanto", "johto", "hoenn", "sinnoh", "unova", "kalos", "alola", "galar", "paldea"]) {
    assert.ok(
      regionRegistrySrc.includes(`cardImageSrc: getRegionStarterImagePath("${regionId}"),`),
      `${regionId} must resolve its own cardImageSrc via getRegionStarterImagePath`
    );
  }
});

test("RegionCard normalizes differently-sized source images with a fixed-height, object-contain, non-cropping frame (never object-cover)", () => {
  assert.ok(regionCardSrc.includes('import { SpriteImage } from "@/components/media/SpriteImage";'));
  assert.ok(regionCardSrc.includes('<div className="flex h-20 w-full items-center justify-center sm:h-24">'));
  assert.ok(regionCardSrc.includes("object-contain"));
  const classNameValues = [...regionCardSrc.matchAll(/className="([^"]*)"/g)].map((match) => match[1]);
  assert.ok(
    classNameValues.every((value) => !value.includes("object-cover")),
    "object-cover would crop starter artwork — must never be used in any className here"
  );
});

test("the card's own height grew alongside the enlarged image frame so the name/cost lines keep their own space", () => {
  assert.ok(regionCardSrc.includes("flex h-40 flex-col items-center justify-center gap-1"));
  assert.ok(regionCardSrc.includes("sm:h-48"));
});

test("RegionCard has a graceful fallback for a temporarily-missing region image (SpriteImage's own placeholder, not a broken-image icon)", () => {
  assert.ok(regionCardSrc.includes("fallbackClassName="));
  assert.ok(regionCardSrc.includes('border border-dashed border-white/20 bg-slate-800/60'));
});

test("the confirm dialog shows the price via the shared CurrencyIcon and the central travel-cost config, never a hardcoded number", () => {
  assert.ok(dialogSrc.includes('import { CurrencyIcon } from "@/features/currency/components/CurrencyIcon";'));
  assert.ok(dialogSrc.includes('import { getRegionTravelCost } from "@/features/regions/config/region-travel-cost.config";'));
  assert.ok(dialogSrc.includes('<CurrencyIcon type="money"'));
  assert.ok(!/\b\d{3,4}\b/.test(dialogSrc.replace(/className="[^"]*"/g, "")), "no literal 3-4 digit price may be hardcoded in the dialog outside className strings");
});
