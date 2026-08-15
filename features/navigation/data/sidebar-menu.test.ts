// EGGS PHASE 7 focused coverage for the sidebar menu data — pure data
// assertions, no DOM/browser needed.
import assert from "node:assert/strict";
import { test } from "node:test";

import { buildSidebarCategories, SIDEBAR_CATEGORIES } from "./sidebar-menu.ts";

test("Hatchery is listed under the SERVICES/SHOPS category (never a new category)", () => {
  const services = SIDEBAR_CATEGORIES.find((category) => category.id === "services");
  assert.ok(services, "the services category must exist");
  assert.equal(services?.label, "שירותים וחנויות");

  const hatchery = services?.items.find((item) => item.id === "hatchery");
  assert.ok(hatchery, "a hatchery item must exist under services");
  assert.equal(hatchery?.href, "/hatchery");
  assert.equal(hatchery?.label, "מדגרה");
});

test("no new sidebar category was added for Hatchery", () => {
  assert.deepEqual(
    SIDEBAR_CATEGORIES.map((category) => category.id),
    ["world", "services", "account"]
  );
});

test("Hatchery's href survives buildSidebarCategories unchanged (it needs no dynamic per-player data, unlike Profile)", () => {
  const categories = buildSidebarCategories("some-username");
  const services = categories.find((category) => category.id === "services");
  const hatchery = services?.items.find((item) => item.id === "hatchery");
  assert.equal(hatchery?.href, "/hatchery");
});
