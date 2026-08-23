// SECURITY & ACCOUNT — USERNAME CHANGE (100 GOLD) — source-level boundary
// coverage. change-username.service.ts calls next/headers (via
// auth.api.updateUser) and imports the real Better Auth instance, which
// this project's plain node:test runner cannot resolve outside a real
// Next.js server context — same established "read the actual source text"
// technique as e.g. features/profile/services/
// update-profile-achievements-visibility.test.ts documents for the
// sibling update-profile.service.ts. spendCurrency's own atomic
// gte-guarded balance check (features/currency/services/
// currency-reward.service.ts) already has its own real, behavioral test
// coverage (currency-reward.service.test.ts) — this file only verifies
// change-username.service.ts is wired to use it correctly, never
// re-proves spendCurrency's own atomicity.
import assert from "node:assert/strict";
import fs from "node:fs";
import { test } from "node:test";

const serviceSrc = fs.readFileSync("features/profile/services/change-username.service.ts", "utf8");
const actionSrc = fs.readFileSync("features/profile/actions/change-username.action.ts", "utf8");
const configSrc = fs.readFileSync("features/profile/config/security-account.config.ts", "utf8");

test("username change costs exactly 100 Gold", () => {
  assert.ok(configSrc.includes("export const USERNAME_CHANGE_COST_GOLD = 100;"));
});

test("the cost constant lives in a client-safe config file, never re-exported from the server-only service (a Client Component dialog must be able to import it directly)", () => {
  assert.ok(
    serviceSrc.includes('import { USERNAME_CHANGE_COST_GOLD } from "@/features/profile/config/security-account.config";')
  );
  assert.ok(!serviceSrc.includes("export const USERNAME_CHANGE_COST_GOLD"), "the service must not also declare/export its own copy");
});

test("the same-username case is rejected BEFORE any availability check or charge", () => {
  const sameUsernameIndex = serviceSrc.indexOf('return { status: "same-username" };');
  const availabilityIndex = serviceSrc.indexOf("auth.api.isUsernameAvailable(");
  const chargeIndex = serviceSrc.indexOf("spendCurrency(tx, playerId,");
  assert.ok(sameUsernameIndex > -1 && availabilityIndex > -1 && chargeIndex > -1);
  assert.ok(sameUsernameIndex < availabilityIndex && availabilityIndex < chargeIndex, "checks must run in order: same-username, then availability, then charge");
});

test("a taken username is rejected before spendCurrency is ever called (no charge for a doomed rename)", () => {
  const availabilityIndex = serviceSrc.indexOf("if (!availability.available)");
  const chargeIndex = serviceSrc.indexOf("spendCurrency(tx, playerId,");
  assert.ok(availabilityIndex > -1 && chargeIndex > -1 && availabilityIndex < chargeIndex);
});

test("the charge uses the SAME atomic gte-guarded spendCurrency every other Gold/coin purchase uses, spending exactly USERNAME_CHANGE_COST_GOLD of gold", () => {
  assert.ok(serviceSrc.includes('import { spendCurrency } from "@/features/currency/services/currency-reward.service";'));
  assert.ok(serviceSrc.includes('spendCurrency(tx, playerId, "gold", USERNAME_CHANGE_COST_GOLD)'));
});

test("insufficient gold rejects without ever calling auth.api.updateUser (no rename attempted)", () => {
  const insufficientIndex = serviceSrc.indexOf('if (!charged) {\n    return { status: "insufficient-gold" };\n  }');
  const updateUserIndex = serviceSrc.indexOf("auth.api.updateUser(");
  assert.ok(insufficientIndex > -1 && updateUserIndex > -1 && insufficientIndex < updateUserIndex);
});

test("a rename failure after the charge refunds the exact same amount that was charged, before returning an error", () => {
  assert.ok(
    serviceSrc.includes("data: { gold: { increment: USERNAME_CHANGE_COST_GOLD } }"),
    "the refund amount must be the same constant as the charge, never a hardcoded duplicate number"
  );
  const catchIndex = serviceSrc.indexOf("} catch (error) {");
  const refundIndex = serviceSrc.indexOf("gold: { increment: USERNAME_CHANGE_COST_GOLD }");
  const returnAfterRefundIndex = serviceSrc.indexOf("isUsernameTakenError(error)");
  assert.ok(catchIndex > -1 && refundIndex > -1 && returnAfterRefundIndex > -1);
  assert.ok(catchIndex < refundIndex && refundIndex < returnAfterRefundIndex, "the refund must happen inside the catch block, before returning the error");
});

test("a successful rename also updates PlayerProfile.displayName, matching every other username-changing path in this codebase", () => {
  assert.ok(serviceSrc.includes("data: { displayName: trimmed }"));
});

test("the acting player/user is always resolved server-side from the session — the action never trusts a client-supplied id", () => {
  assert.ok(actionSrc.includes("const session = await getCurrentSession();"));
  assert.ok(actionSrc.includes("const profile = await getPlayerProfile(session.user.id);"));
  assert.ok(actionSrc.includes("changeUsername(profile.id, currentUsername, parsed.data.newUsername)"));
});

test("the input is validated with changeUsernameSchema before ever reaching the service", () => {
  assert.ok(actionSrc.includes("changeUsernameSchema.safeParse(input)"));
});
