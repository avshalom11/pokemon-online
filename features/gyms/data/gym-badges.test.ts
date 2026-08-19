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

// GYM BADGE/MEDAL IMAGE ORDER — FULL CONSISTENCY FIX (later task) — one
// shared flat folder (public/images/gyms/badges/), 4 slots per region (3
// Badges + that region's own Medal as the 4th slot) — via the one
// deterministic getGymBadgeImageUrl helper (gym-badge-images.ts), the SAME
// SLOTS_PER_REGION rule getRegionalMedalImageUrl also uses.
test("each badge's image path follows /images/gyms/badges/<n>.png, n derived from getGymBadgeImageUrl", () => {
  for (const badge of GYM_BADGE_DEFINITIONS) {
    assert.equal(badge.imageUrl, getGymBadgeImageUrl(badge.regionId, badge.gymNumber));
    assert.match(badge.imageUrl, /^\/images\/gyms\/badges\/\d+\.png$/);
  }
});

test("badge numbering runs in 4-slot-per-region blocks, skipping each region's own Medal slot (Kanto Gym1-3=1,2,3 ... Paldea Gym1-3=33,34,35)", () => {
  assert.equal(getGymBadgeImageUrl("kanto", 1), "/images/gyms/badges/1.png");
  assert.equal(getGymBadgeImageUrl("kanto", 2), "/images/gyms/badges/2.png");
  assert.equal(getGymBadgeImageUrl("kanto", 3), "/images/gyms/badges/3.png");
  assert.equal(getGymBadgeImageUrl("johto", 1), "/images/gyms/badges/5.png");
  assert.equal(getGymBadgeImageUrl("johto", 2), "/images/gyms/badges/6.png");
  assert.equal(getGymBadgeImageUrl("johto", 3), "/images/gyms/badges/7.png");
  assert.equal(getGymBadgeImageUrl("hoenn", 1), "/images/gyms/badges/9.png");
  assert.equal(getGymBadgeImageUrl("sinnoh", 1), "/images/gyms/badges/13.png");
  assert.equal(getGymBadgeImageUrl("unova", 1), "/images/gyms/badges/17.png");
  assert.equal(getGymBadgeImageUrl("kalos", 1), "/images/gyms/badges/21.png");
  assert.equal(getGymBadgeImageUrl("alola", 1), "/images/gyms/badges/25.png");
  assert.equal(getGymBadgeImageUrl("galar", 1), "/images/gyms/badges/29.png");
  assert.equal(getGymBadgeImageUrl("paldea", 1), "/images/gyms/badges/33.png");
  assert.equal(getGymBadgeImageUrl("paldea", 3), "/images/gyms/badges/35.png");

  const allNumbers = GYM_BADGE_DEFINITIONS.map((b) => Number(b.imageUrl.match(/(\d+)\.png$/)![1])).sort((a, b) => a - b);
  const expected = [1, 2, 3, 5, 6, 7, 9, 10, 11, 13, 14, 15, 17, 18, 19, 21, 22, 23, 25, 26, 27, 29, 30, 31, 33, 34, 35];
  assert.deepEqual(allNumbers, expected, "badge numbers must be exactly the 3 non-Medal slots of each region's own 4-slot block, each used once, never a Medal slot (4, 8, 12, ...)");
});

test("Badge and Medal numbers together cover exactly 1..36 once each — one single shared numbering system, never two that can drift apart", () => {
  const badgeNumbers = GYM_BADGE_DEFINITIONS.map((b) => Number(b.imageUrl.match(/(\d+)\.png$/)![1]));
  const medalNumbers = [4, 8, 12, 16, 20, 24, 28, 32, 36];
  const all = [...badgeNumbers, ...medalNumbers].sort((a, b) => a - b);
  assert.deepEqual(all, Array.from({ length: 36 }, (_, i) => i + 1));
});

test("getGymBadgeDefinition returns the matching catalog entry", () => {
  const badge = getGymBadgeDefinition("kanto", 2);
  assert.equal(badge.id, "kanto-gym-2");
  assert.equal(badge.regionId, "kanto");
  assert.equal(badge.gymNumber, 2);
  assert.equal(badge.displayName, "Kanto Fire Badge");
});
