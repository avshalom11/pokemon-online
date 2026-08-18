import assert from "node:assert/strict";
import { test } from "node:test";

import { GYM_BADGE_DEFINITIONS, getGymBadgeDefinition } from "./gym-badges.ts";
import { getAllGymDefinitions } from "./gym-registry.ts";

test("exactly 27 Gym Badge definitions exist, one per GymDefinition", () => {
  assert.equal(GYM_BADGE_DEFINITIONS.length, 27);
  const badgeIds = new Set(GYM_BADGE_DEFINITIONS.map((b) => b.id));
  assert.equal(badgeIds.size, 27, "every badge id must be unique");

  const gymIds = getAllGymDefinitions().map((g) => g.id);
  assert.deepEqual([...badgeIds].sort(), [...gymIds].sort());
});

test("each badge's image path follows /images/gyms/badges/<region>/<badge-id>.png", () => {
  for (const badge of GYM_BADGE_DEFINITIONS) {
    assert.equal(badge.imageUrl, `/images/gyms/badges/${badge.regionId}/${badge.id}.png`);
  }
});

test("getGymBadgeDefinition returns the matching catalog entry", () => {
  const badge = getGymBadgeDefinition("kanto", 2);
  assert.equal(badge.id, "kanto-gym-2");
  assert.equal(badge.regionId, "kanto");
  assert.equal(badge.gymNumber, 2);
  assert.equal(badge.displayName, "Kanto Fire Badge");
});
