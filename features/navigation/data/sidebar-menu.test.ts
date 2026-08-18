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

// NAVIGATION UPDATE — the game's main/home screen, added to the sidebar.
test("Home is listed under the WORLD category (never a new category), using the real /home route", () => {
  const world = SIDEBAR_CATEGORIES.find((category) => category.id === "world");
  assert.ok(world, "the world category must exist");

  const home = world?.items.find((item) => item.id === "home");
  assert.ok(home, "a home item must exist under world");
  assert.equal(home?.href, "/home");
  assert.equal(home?.label, "מסך ראשי");
});

test("Home is the first item in the world category, alongside World/Map/Gyms/Leagues", () => {
  const world = SIDEBAR_CATEGORIES.find((category) => category.id === "world");
  assert.deepEqual(world?.items.map((item) => item.id), ["home", "world", "map", "gyms", "leagues"]);
});

// GYMS & LEAGUES PHASE 4 — section 34's own "sidebar Gym link data exists"
// requirement.
test("Gyms is listed under the WORLD category, right after World/Map, using the real /gyms route", () => {
  const world = SIDEBAR_CATEGORIES.find((category) => category.id === "world");
  const gyms = world?.items.find((item) => item.id === "gyms");
  assert.ok(gyms, "a gyms item must exist under world");
  assert.equal(gyms?.href, "/gyms");
  assert.equal(gyms?.label, "מכונים");
});

// GYMS & LEAGUES PHASE 5 — section 30's own "sidebar League link exists"
// requirement.
test("Leagues is listed under the WORLD category, right after Gyms, using the real /leagues route", () => {
  const world = SIDEBAR_CATEGORIES.find((category) => category.id === "world");
  const leagues = world?.items.find((item) => item.id === "leagues");
  assert.ok(leagues, "a leagues item must exist under world");
  assert.equal(leagues?.href, "/leagues");
  assert.equal(leagues?.label, "ליגות");
});

test("no new sidebar category was added for Home either", () => {
  assert.deepEqual(
    SIDEBAR_CATEGORIES.map((category) => category.id),
    ["world", "services", "account"]
  );
});

test("Home's href survives buildSidebarCategories unchanged (it needs no dynamic per-player data, unlike Profile)", () => {
  const categories = buildSidebarCategories("some-username");
  const world = categories.find((category) => category.id === "world");
  const home = world?.items.find((item) => item.id === "home");
  assert.equal(home?.href, "/home");
});
