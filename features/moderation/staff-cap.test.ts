// STAFF / MODERATION — PHASE 1 — STAFF CAP CONCURRENCY. Proves
// appointStaffRole's guarded-updateMany CAS mechanism (see that
// function's own doc comment in staff-role.service.ts) actually holds the
// 1-DEPUTY/3-SUPPORT caps under concurrent appointment attempts, not just
// sequential ones — a plain "COUNT then INSERT" would let two concurrent
// requests both read the same pre-insert count and both pass.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { STAFF_LIMITS } from "@/features/moderation/config/staff-roles.config";
import { appointStaffRole } from "@/features/moderation/services/staff-role.service";
import { getStaffRosterCounterRow, resetFakeDb, seedPlayerProfile } from "../../test/support/fakes/prisma.fake.ts";

beforeEach(() => {
  resetFakeDb();
  seedPlayerProfile({ id: "owner-1" });
  for (let i = 0; i < 6; i += 1) seedPlayerProfile({ id: `candidate-${i}` });
});

// 1 — sequential cap enforcement (sanity baseline before the concurrency case)
test("1: a 2nd sequential DEPUTY appointment is rejected once the cap of 1 is reached", async () => {
  const first = await appointStaffRole({ targetPlayerId: "candidate-0", role: "DEPUTY", appointedByPlayerId: "owner-1" });
  assert.equal(first.ok, true);

  const second = await appointStaffRole({ targetPlayerId: "candidate-1", role: "DEPUTY", appointedByPlayerId: "owner-1" });
  assert.deepEqual(second, { ok: false, error: "role-cap-reached" });
  assert.equal(getStaffRosterCounterRow()?.deputyCount, 1);
});

// 2 — CONCURRENCY: two simultaneous DEPUTY appointments for different candidates
test("2: two concurrent DEPUTY appointment attempts for different candidates — exactly one succeeds", async () => {
  const [resultA, resultB] = await Promise.all([
    appointStaffRole({ targetPlayerId: "candidate-0", role: "DEPUTY", appointedByPlayerId: "owner-1" }),
    appointStaffRole({ targetPlayerId: "candidate-1", role: "DEPUTY", appointedByPlayerId: "owner-1" }),
  ]);
  const outcomes = [resultA, resultB];
  const successes = outcomes.filter((result) => result.ok);
  const rejections = outcomes.filter((result) => !result.ok);
  assert.equal(successes.length, 1, "the DEPUTY cap of 1 must allow exactly one of the two concurrent appointments to succeed");
  assert.equal(rejections.length, 1);
  assert.deepEqual(rejections[0], { ok: false, error: "role-cap-reached" });
  assert.equal(getStaffRosterCounterRow()?.deputyCount, 1, "the counter must never exceed the cap even under the race");
});

// 3 — CONCURRENCY: SUPPORT cap of 3 under a burst of concurrent requests
test("3: 5 concurrent SUPPORT appointment attempts against a cap of 3 — exactly 3 succeed", async () => {
  const results = await Promise.all(
    ["candidate-0", "candidate-1", "candidate-2", "candidate-3", "candidate-4"].map((targetPlayerId) =>
      appointStaffRole({ targetPlayerId, role: "SUPPORT", appointedByPlayerId: "owner-1" })
    )
  );
  const successCount = results.filter((result) => result.ok).length;
  const rejectionCount = results.filter((result) => !result.ok).length;
  assert.equal(successCount, STAFF_LIMITS.SUPPORT);
  assert.equal(rejectionCount, 5 - STAFF_LIMITS.SUPPORT);
  assert.equal(getStaffRosterCounterRow()?.supportCount, STAFF_LIMITS.SUPPORT, "the counter must never exceed the cap even under the race");
  for (const result of results) {
    if (!result.ok) assert.equal(result.error, "role-cap-reached");
  }
});

// 4 — DEPUTY and SUPPORT caps are tracked independently
test("4: the DEPUTY cap and SUPPORT cap are enforced independently — filling one never affects the other", async () => {
  const deputyResult = await appointStaffRole({ targetPlayerId: "candidate-0", role: "DEPUTY", appointedByPlayerId: "owner-1" });
  assert.equal(deputyResult.ok, true);

  const supportResults = await Promise.all(
    ["candidate-1", "candidate-2", "candidate-3"].map((targetPlayerId) =>
      appointStaffRole({ targetPlayerId, role: "SUPPORT", appointedByPlayerId: "owner-1" })
    )
  );
  assert.ok(supportResults.every((result) => result.ok), "the DEPUTY appointment must not have consumed any SUPPORT capacity");
  assert.equal(getStaffRosterCounterRow()?.deputyCount, 1);
  assert.equal(getStaffRosterCounterRow()?.supportCount, 3);
});
