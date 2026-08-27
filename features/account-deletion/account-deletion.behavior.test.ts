// ACCOUNT DELETION — real behavioral coverage. Runs the actual services
// (requestAccountDeletion / checkDeletionToken / confirmAccountDeletion)
// against the fake Prisma DB and fake email transport (see
// test/support/fakes/prisma.fake.ts and send-email.fake.ts, both wired in
// by alias-loader.mjs) — same "real service, fake I/O" shape every other
// feature's behavioral tests in this codebase already use.
import assert from "node:assert/strict";
import { test, beforeEach } from "node:test";

import { confirmAccountDeletion, checkDeletionToken } from "@/features/account-deletion/services/account-deletion.service";
import { requestAccountDeletion } from "@/features/account-deletion/services/account-deletion-request.service";
import { hashDeletionToken } from "@/lib/auth/account-deletion-token";
import { prisma } from "@/lib/db/prisma";
import {
  resetFakeDb,
  seedUser,
  seedPlayerProfile,
  seedPlayerPokemon,
  seedFieldBattleSession,
  seedAccountDeletionRequest,
  seedMarketplaceListing,
  seedMarketplaceListingPokemon,
  getUserRow,
  getAccountDeletionRequestByUserId,
  getFieldBattleSessionRow,
} from "../../test/support/fakes/prisma.fake.ts";
import { getSentEmails, resetSendEmailFake, setSendEmailShouldFail } from "../../test/support/fakes/send-email.fake.ts";

// Same "set the secret directly in-process" convention as
// lib/auth/request-ip.test.ts's own hashIp coverage — this file is the
// only place in this suite that touches BETTER_AUTH_SECRET-keyed hashing.
process.env.BETTER_AUTH_SECRET = "test-secret-value";

beforeEach(() => {
  resetFakeDb();
  resetSendEmailFake();
});

function extractTokenFromEmailUrl(url: string): string {
  const match = url.match(/token=([0-9a-f]+)/);
  assert.ok(match, `expected a token= query param in the confirmation URL, got: ${url}`);
  return match![1];
}

// (1) requestAccountDeletion resolves the email from the DB itself and
// sends to that address only — never a client-suppliable value (this
// function's only input is `userId`).
test("(1) the deletion email is sent to the account's own registered email, resolved server-side", async () => {
  seedUser({ id: "user-1", username: "victim", email: "victim@example.com" });

  const result = await requestAccountDeletion("user-1");

  assert.equal(result.status, "success");
  const sent = getSentEmails();
  assert.equal(sent.length, 1);
  assert.equal(sent[0].to, "victim@example.com");
});

// (2) the token stored in the DB is a hash, never the raw token — a raw DB
// read alone (e.g. a leaked backup) can never be replayed as a valid link.
test("(2) only a hashed token is ever persisted — the raw token never touches the database", async () => {
  seedUser({ id: "user-2", username: "victim2", email: "victim2@example.com" });
  await requestAccountDeletion("user-2");

  const sent = getSentEmails();
  const rawToken = extractTokenFromEmailUrl(sent[0].html);
  const stored = getAccountDeletionRequestByUserId("user-2");

  assert.ok(stored);
  assert.notEqual(stored!.tokenHash, rawToken);
  assert.equal(stored!.tokenHash, hashDeletionToken(rawToken));
});

// (3) issuing a second deletion request invalidates the first — "only the
// latest valid request should remain usable" (repeated-click safety).
test("(3) a new deletion request invalidates the previous outstanding one", async () => {
  seedUser({ id: "user-3", username: "victim3", email: "victim3@example.com" });

  await requestAccountDeletion("user-3");
  const firstRawToken = extractTokenFromEmailUrl(getSentEmails()[0].html);

  await requestAccountDeletion("user-3");
  const secondRawToken = extractTokenFromEmailUrl(getSentEmails()[1].html);

  assert.equal(await checkDeletionToken(firstRawToken), "invalid");
  assert.equal(await checkDeletionToken(secondRawToken), "valid");
});

// (4) Resend failure leaves the account (and the bookkeeping row) entirely
// untouched, and reports a clean, retryable error.
test("(4) a failed email send removes the just-issued token and reports a clean error — no dangling valid link, no account changes", async () => {
  seedUser({ id: "user-4", username: "victim4", email: "victim4@example.com" });
  setSendEmailShouldFail(true);

  const result = await requestAccountDeletion("user-4");

  assert.equal(result.status, "error");
  assert.equal(getAccountDeletionRequestByUserId("user-4"), undefined);
  assert.ok(getUserRow("user-4"), "the account itself must still exist");
});

// (4b) CRASH FIX — a failure in phase 1 (token creation, e.g. a real
// stale-Prisma-Client-after-migration DB error like the one that actually
// crashed the site) must be caught and reported cleanly, never thrown
// uncaught out of requestAccountDeletion. No email is sent, and the
// account is left completely untouched.
test("(4b) a phase-1 (token transaction) failure returns a clean error instead of throwing — no crash, no email sent, account untouched", async () => {
  seedUser({ id: "user-4b", username: "victim4b", email: "victim4b@example.com" });

  const originalCreate = prisma.accountDeletionRequest.create;
  // Deliberately breaking this one call to simulate a real DB-layer
  // failure (e.g. a stale Prisma Client instance missing this model right
  // after a migration — the actual root cause of the real crash this test
  // guards against).
  // @ts-expect-error — the real (chainable, generic) Prisma method type
  // doesn't structurally accept a plain zero-arg function; only the test's
  // own fake-friendly stub is needed here.
  prisma.accountDeletionRequest.create = async () => {
    throw new TypeError("Cannot read properties of undefined (reading 'create')");
  };

  try {
    // No try/catch of our own here — a throw would fail the test itself,
    // proving requestAccountDeletion really does swallow this and resolve
    // normally instead of rejecting.
    const result = await requestAccountDeletion("user-4b");
    assert.equal(result.status, "error");
  } finally {
    prisma.accountDeletionRequest.create = originalCreate;
  }

  assert.equal(getSentEmails().length, 0, "the email step must never be reached when phase 1 itself fails");
  assert.ok(getUserRow("user-4b"), "the account itself must still exist");
});

// (5) an unrecognized token is rejected cleanly, without revealing whether
// any account exists.
test("(5) checkDeletionToken/confirmAccountDeletion reject a garbage token as invalid", async () => {
  assert.equal(await checkDeletionToken("not-a-real-token"), "invalid");
  const result = await confirmAccountDeletion("not-a-real-token");
  assert.deepEqual(result, { status: "invalid" });
});

// (6) an expired token is rejected, and does not delete the account.
test("(6) an expired token is rejected — the account is never deleted", async () => {
  seedUser({ id: "user-6", username: "victim6", email: "victim6@example.com" });
  seedPlayerProfile({ id: "profile-6" });
  const rawToken = "a".repeat(64);
  seedAccountDeletionRequest({
    userId: "user-6",
    tokenHash: hashDeletionToken(rawToken),
    expiresAt: new Date(Date.now() - 1000),
  });

  assert.equal(await checkDeletionToken(rawToken), "expired");
  const result = await confirmAccountDeletion(rawToken);
  assert.deepEqual(result, { status: "expired" });
  assert.ok(getUserRow("user-6"), "account must still exist after an expired-token attempt");
});

// (7) an already-used token is rejected on a second attempt — proves
// single-use and protects against a replayed/leaked link.
test("(7) a token cannot be used twice — the second confirm attempt is rejected as \"used\", the account is deleted only once", async () => {
  seedUser({ id: "user-7", username: "victim7", email: "victim7@example.com" });
  seedPlayerProfile({ id: "user-7" });
  seedPlayerPokemon({ id: "pkmn-7", playerId: "user-7" });
  seedFieldBattleSession({
    playerId: "user-7",
    zoneId: "grassland",
    wildSpeciesId: "1",
    wildLevel: 5,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "pkmn-7",
  });
  const rawToken = "b".repeat(64);
  seedAccountDeletionRequest({ userId: "user-7", tokenHash: hashDeletionToken(rawToken), expiresAt: new Date(Date.now() + 60_000) });

  const first = await confirmAccountDeletion(rawToken);
  assert.deepEqual(first, { status: "success" });
  assert.equal(getUserRow("user-7"), undefined, "the account must actually be gone");

  const second = await confirmAccountDeletion(rawToken);
  assert.deepEqual(second, { status: "used" });
});

// (8) a valid, unexpired, unused token DOES delete the account — the
// actual permanent-deletion path, including the field battle session
// (proving an active session doesn't block deletion, and is cleaned up).
test("(8) a valid token permanently deletes the account and its field battle session", async () => {
  seedUser({ id: "user-8", username: "victim8", email: "victim8@example.com" });
  seedPlayerProfile({ id: "user-8" });
  seedPlayerPokemon({ id: "pkmn-8", playerId: "user-8" });
  seedFieldBattleSession({
    playerId: "user-8",
    zoneId: "grassland",
    wildSpeciesId: "1",
    wildLevel: 5,
    wildCurrentHp: 10,
    wildMaxHp: 10,
    activePlayerPokemonId: "pkmn-8",
  });
  const rawToken = "c".repeat(64);
  seedAccountDeletionRequest({ userId: "user-8", tokenHash: hashDeletionToken(rawToken), expiresAt: new Date(Date.now() + 60_000) });

  const result = await confirmAccountDeletion(rawToken);

  assert.deepEqual(result, { status: "success" });
  assert.equal(getUserRow("user-8"), undefined);
  assert.equal(getFieldBattleSessionRow("user-8"), undefined, "an active field battle session must not block deletion, and must itself be removed");
});

// (9) deleted credentials can no longer be found/used to sign in — the
// User row backing username/email lookup is actually gone.
test("(9) after deletion, the account no longer resolves by id, username, or email", async () => {
  seedUser({ id: "user-9", username: "victim9", email: "victim9@example.com" });
  const rawToken = "d".repeat(64);
  seedAccountDeletionRequest({ userId: "user-9", tokenHash: hashDeletionToken(rawToken), expiresAt: new Date(Date.now() + 60_000) });

  await confirmAccountDeletion(rawToken);

  const byId = await prisma.user.findUnique({ where: { id: "user-9" } });
  const byUsername = await prisma.user.findUnique({ where: { username: "victim9" } });
  const byEmail = await prisma.user.findUnique({ where: { email: "victim9@example.com" } });
  assert.equal(byId, null);
  assert.equal(byUsername, null);
  assert.equal(byEmail, null);
});

// (10) deleting player A's LeagueTournamentPlacement rows never touches
// player B's own placement rows in the same tournament — the explicit,
// non-FK cleanup this task's schema audit found is scoped correctly.
test("(10) deleting account A removes only A's own league placement rows, never B's", async () => {
  seedUser({ id: "user-a", username: "playera", email: "a@example.com" });
  seedPlayerProfile({ id: "user-a" });
  seedPlayerProfile({ id: "profile-b" });
  await prisma.leagueTournamentPlacement.create({
    data: { tournamentId: "tourn-1", place: 1, participantId: "participant-a", playerId: "user-a" },
  });
  await prisma.leagueTournamentPlacement.create({
    data: { tournamentId: "tourn-1", place: 2, participantId: "participant-b", playerId: "profile-b" },
  });

  const rawToken = "e".repeat(64);
  seedAccountDeletionRequest({ userId: "user-a", tokenHash: hashDeletionToken(rawToken), expiresAt: new Date(Date.now() + 60_000) });
  const result = await confirmAccountDeletion(rawToken);
  assert.deepEqual(result, { status: "success" });

  const remaining = await prisma.leagueTournamentPlacement.findMany({ where: { tournamentId: "tourn-1" } });
  assert.deepEqual(
    remaining.map((row: { playerId: string }) => row.playerId),
    ["profile-b"]
  );
});

// (11) deleting account A never deletes account B's own row.
test("(11) deleting account A never deletes account B", async () => {
  seedUser({ id: "user-a2", username: "playera2", email: "a2@example.com" });
  seedUser({ id: "user-b2", username: "playerb2", email: "b2@example.com" });

  const rawToken = "f".repeat(64);
  seedAccountDeletionRequest({ userId: "user-a2", tokenHash: hashDeletionToken(rawToken), expiresAt: new Date(Date.now() + 60_000) });
  await confirmAccountDeletion(rawToken);

  assert.equal(getUserRow("user-a2"), undefined);
  assert.ok(getUserRow("user-b2"), "account B must be completely untouched");
});

// (13) MARKETPLACE PHASE 7 (hardening) — deleting a seller's account with an
// active/editing listing must not be blocked by the listing's own
// Marketplace-lock row (MarketplaceListingPokemon, onDelete: Restrict on
// its Pokémon relation) — the lock row is explicitly cleared as part of
// the same deletion transaction, alongside FieldBattleSession/
// LeagueTournamentPlacement above.
test("(13) MARKETPLACE — deleting an account with an active listing succeeds and releases the listing's Pokémon lock", async () => {
  seedUser({ id: "seller-13", username: "seller13", email: "seller13@example.com" });
  seedPlayerProfile({ id: "seller-13" });
  seedPlayerPokemon({ id: "pkmn-13", playerId: "seller-13" });
  const listing = seedMarketplaceListing({ sellerId: "seller-13", status: "active" });
  seedMarketplaceListingPokemon({ playerPokemonId: "pkmn-13", listingId: listing.id });

  const rawToken = "g".repeat(64);
  seedAccountDeletionRequest({ userId: "seller-13", tokenHash: hashDeletionToken(rawToken), expiresAt: new Date(Date.now() + 60_000) });

  const result = await confirmAccountDeletion(rawToken);

  assert.deepEqual(result, { status: "success" });
  assert.equal(getUserRow("seller-13"), undefined);
  const lock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "pkmn-13" } });
  assert.equal(lock, null, "the listing's Pokémon lock must be released as part of account deletion");
});

// (14) MARKETPLACE PHASE 7 (hardening) — same, but for an "editing" listing
// (the mid-edit state), and proves an unrelated seller's own listing/lock
// is left completely untouched.
test("(14) MARKETPLACE — deleting an account with an editing listing succeeds and never touches another seller's own listing lock", async () => {
  seedUser({ id: "seller-14", username: "seller14", email: "seller14@example.com" });
  seedPlayerProfile({ id: "seller-14" });
  seedPlayerPokemon({ id: "pkmn-14", playerId: "seller-14" });
  const listing = seedMarketplaceListing({ sellerId: "seller-14", status: "editing" });
  seedMarketplaceListingPokemon({ playerPokemonId: "pkmn-14", listingId: listing.id });

  seedPlayerProfile({ id: "other-seller-14" });
  seedPlayerPokemon({ id: "other-pkmn-14", playerId: "other-seller-14" });
  const otherListing = seedMarketplaceListing({ sellerId: "other-seller-14", status: "active" });
  seedMarketplaceListingPokemon({ playerPokemonId: "other-pkmn-14", listingId: otherListing.id });

  const rawToken = "h".repeat(64);
  seedAccountDeletionRequest({ userId: "seller-14", tokenHash: hashDeletionToken(rawToken), expiresAt: new Date(Date.now() + 60_000) });

  const result = await confirmAccountDeletion(rawToken);

  assert.deepEqual(result, { status: "success" });
  const ownLock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "pkmn-14" } });
  assert.equal(ownLock, null);
  const otherLock = await prisma.marketplaceListingPokemon.findUnique({ where: { playerPokemonId: "other-pkmn-14" } });
  assert.ok(otherLock, "an unrelated seller's own listing lock must never be touched");
});

// (15) confirmAccountDeletion never accepts a userId/playerId at all — the
// token record's OWN userId is the only source of truth for which account
// gets deleted, so a token minted for account A can never be aimed at a
// different account B (there is no parameter through which B's id could
// even be supplied).
test("(15) confirmAccountDeletion's only input is the token — resolving the account entirely from the token record itself", () => {
  assert.equal(confirmAccountDeletion.length, 1, "confirmAccountDeletion must take exactly one parameter (the raw token)");
});
