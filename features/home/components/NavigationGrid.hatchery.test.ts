// NAVIGATION UPDATE — regression guard: the Home screen's navigation grid
// must offer a Hatchery card through its existing data-driven
// STATIC_NAVIGATION_ITEMS config, never a hardcoded separate button.
// NavigationGrid is a component with no React Testing Library/jsdom set up
// in this project, so this checks the invariant via a static source read —
// same approach as features/shop/components/ShopItemCard.test.ts.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const gridSource = readFileSync(new URL("./NavigationGrid.tsx", import.meta.url), "utf8");

test("Hatchery is listed in STATIC_NAVIGATION_ITEMS, routing to the real /hatchery page", () => {
  assert.match(gridSource, /\{\s*title:\s*"מדגרה",\s*icon:\s*"🥚",\s*href:\s*"\/hatchery"\s*\}/, "a Hatchery entry with the exact route must exist in the static config");
});

test("Hatchery is rendered through the same NavigationCard mapping every other item uses, never a hardcoded extra card", () => {
  const staticItemsBlock = gridSource.slice(gridSource.indexOf("STATIC_NAVIGATION_ITEMS = ["), gridSource.indexOf("] as const;"));
  assert.ok(staticItemsBlock.includes('"מדגרה"'), "Hatchery must be inside the shared STATIC_NAVIGATION_ITEMS array");
  // HOME QUICK ACCESS — now three: the STATIC_NAVIGATION_ITEMS map, the
  // hardcoded Profile card, and the hardcoded player-search action card
  // (opens PlayerSearchModal in place, same as the sidebar's own
  // "חיפוש שחקנים" entry — never a route, so it can't live in the
  // STATIC_NAVIGATION_ITEMS href-driven map). Hatchery itself must not add
  // a fourth.
  assert.equal((gridSource.match(/<NavigationCard/g) ?? []).length, 3, "exactly three NavigationCard usages: the STATIC_NAVIGATION_ITEMS map, the hardcoded Profile card, and the hardcoded player-search action card — Hatchery must not add a fourth");
});
