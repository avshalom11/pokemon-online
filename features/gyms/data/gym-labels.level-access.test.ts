// PLAYER LEVEL ACCESS REQUIREMENTS — proves every Gym lock-reason label
// actually reflects MIN_GYM_PLAYER_LEVEL (now 7) rather than a stale
// hardcoded "10" — the exact drift this feature fell into before these
// three strings were switched to interpolate the real constant (see
// gym-labels.ts's own regionGymLockMessageHe/regionStatusLabelHe/
// gymStartResultMessageHe doc comments).
import assert from "node:assert/strict";
import { test } from "node:test";

import { MIN_GYM_PLAYER_LEVEL } from "@/features/gyms/config/gym-access-rules.config";
import { gymStartResultMessageHe, regionGymLockMessageHe, regionStatusLabelHe } from "@/features/gyms/data/gym-labels";

test("MIN_GYM_PLAYER_LEVEL is exactly 7", () => {
  assert.equal(MIN_GYM_PLAYER_LEVEL, 7);
});

test("regionGymLockMessageHe('locked-level') shows 7, never 10", () => {
  const message = regionGymLockMessageHe("locked-level", "kanto");
  assert.match(message, /7/);
  assert.doesNotMatch(message, /10/);
  assert.equal(message, "המכונים זמינים החל מרמה 7.");
});

test("regionStatusLabelHe('locked-level') shows 7, never 10", () => {
  const label = regionStatusLabelHe("locked-level");
  assert.match(label, /7/);
  assert.doesNotMatch(label, /10/);
});

test("gymStartResultMessageHe('locked-level') shows 7, never 10", () => {
  const message = gymStartResultMessageHe("locked-level");
  assert.match(message, /7/);
  assert.doesNotMatch(message, /10/);
  assert.equal(message, "המכונים זמינים החל מרמה 7.");
});
