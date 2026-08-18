import assert from "node:assert/strict";
import { test } from "node:test";

import { GYM_BADGE_DEFINITIONS, getGymBadgeDefinition } from "./gym-badges.ts";
import { getGymBadgeImageUrl } from "./gym-badge-images.ts";
import { getAllGymDefinitions } from "./gym-registry.ts";

test("exactly 27 Gym Badge definitions exist, one per GymDefinition", () => {
  assert.equal(GYM_BADGE_DEFINITIONS.length, 27);
  const badgeIds = new Set(GYM_BADGE_DEFINITIONS.map((b) => b.id));
  assert.equal(badgeIds.size, 27, "every badge id must be unique");

  const gymIds = getAllGymDefinitions().map((g) => g.id);
  assert.deepEqual([...badgeIds].sort(), [...gymIds].sort());
});

// GYM BADGES / MEDALS — SIMPLE NUMERIC IMAGE ARCHITECTURE (later task) —
// one shared flat folder, 1.png..27.png in region-progression order, via
// the one deterministic getGymBadgeImageUrl helper (gym-badge-images.ts).
test("each badge's image path follows /images/gyms/badges/<n>.png, n derived from getGymBadgeImageUrl", () => {
  for (const badge of GYM_BADGE_DEFINITIONS) {
    assert.equal(badge.imageUrl, getGymBadgeImageUrl(badge.regionId, badge.gymNumber));
    assert.match(badge.imageUrl, /^\/images\/gyms\/badges\/\d+\.png$/);
  }
});

test("badge numbering runs 1-27 in region-progression order (Kanto Gym1=1 ... Paldea Gym3=27)", () => {
  assert.equal(getGymBadgeImageUrl("kanto", 1), "/images/gyms/badges/1.png");
  assert.equal(getGymBadgeImageUrl("kanto", 2), "/images/gyms/badges/2.png");
  assert.equal(getGymBadgeImageUrl("kanto", 3), "/images/gyms/badges/3.png");
  assert.equal(getGymBadgeImageUrl("johto", 1), "/images/gyms/badges/4.png");
  assert.equal(getGymBadgeImageUrl("hoenn", 1), "/images/gyms/badges/7.png");
  assert.equal(getGymBadgeImageUrl("sinnoh", 1), "/images/gyms/badges/10.png");
  assert.equal(getGymBadgeImageUrl("unova", 1), "/images/gyms/badges/13.png");
  assert.equal(getGymBadgeImageUrl("kalos", 1), "/images/gyms/badges/16.png");
  assert.equal(getGymBadgeImageUrl("alola", 1), "/images/gyms/badges/19.png");
  assert.equal(getGymBadgeImageUrl("galar", 1), "/images/gyms/badges/22.png");
  assert.equal(getGymBadgeImageUrl("paldea", 1), "/images/gyms/badges/25.png");
  assert.equal(getGymBadgeImageUrl("paldea", 3), "/images/gyms/badges/27.png");

  const allNumbers = GYM_BADGE_DEFINITIONS.map((b) => Number(b.imageUrl.match(/(\d+)\.png$/)![1])).sort((a, b) => a - b);
  assert.deepEqual(allNumbers, Array.from({ length: 27 }, (_, i) => i + 1), "badge numbers must be exactly 1..27, each used once");
});

test("getGymBadgeDefinition returns the matching catalog entry", () => {
  const badge = getGymBadgeDefinition("kanto", 2);
  assert.equal(badge.id, "kanto-gym-2");
  assert.equal(badge.regionId, "kanto");
  assert.equal(badge.gymNumber, 2);
  assert.equal(badge.displayName, "Kanto Fire Badge");
});
