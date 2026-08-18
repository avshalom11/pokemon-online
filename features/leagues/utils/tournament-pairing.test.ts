// GYMS & LEAGUES PHASE 5 — focused coverage for the pure Round-1 pairing
// generator (section 12 of this Phase's spec). No DB, no Prisma — pure
// function tests only.
import assert from "node:assert/strict";
import { test } from "node:test";

import { generateRound1Pairings } from "./tournament-pairing.ts";

// A trivial deterministic "random source" that always returns 0 — Fisher-
// Yates with randomSource() === 0 always picks index 0 at each step, which
// leaves the array in REVERSE order relative to how items were swapped in;
// deterministic and reproducible either way, which is all these tests need.
const ZERO_RANDOM = () => 0;

function ids(count: number): string[] {
  return Array.from({ length: count }, (_, i) => `p${i + 1}`);
}

test("2 players -> 1 match", () => {
  const result = generateRound1Pairings(ids(2), ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.pairings.length, 1);
});

test("4 players -> 2 matches", () => {
  const result = generateRound1Pairings(ids(4), ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.pairings.length, 2);
});

test("10 players -> 5 matches", () => {
  const result = generateRound1Pairings(ids(10), ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.pairings.length, 5);
  assert.ok(result.pairings.every((p) => p.sideA.kind === "player" && p.sideB.kind === "player"));
});

test("5 players -> exactly one computer filler + 3 matches", () => {
  const result = generateRound1Pairings(ids(5), ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  assert.equal(result.pairings.length, 3);

  const computerSides = result.pairings.flatMap((p) => [p.sideA, p.sideB]).filter((side) => side.kind === "computer");
  assert.equal(computerSides.length, 1);
});

test("every odd real-player count creates exactly one filler (7, 9, 11)", () => {
  for (const count of [7, 9, 11]) {
    const result = generateRound1Pairings(ids(count), ZERO_RANDOM);
    assert.equal(result.status, "ok");
    if (result.status !== "ok") continue;
    const computerSides = result.pairings.flatMap((p) => [p.sideA, p.sideB]).filter((side) => side.kind === "computer");
    assert.equal(computerSides.length, 1, `${count} real players should create exactly one filler`);
    assert.equal(result.pairings.length, Math.ceil(count / 2));
  }
});

test("filler participant type is stored correctly as kind: 'computer', never a fabricated player id", () => {
  const result = generateRound1Pairings(ids(3), ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  const computerSide = result.pairings.flatMap((p) => [p.sideA, p.sideB]).find((side) => side.kind === "computer");
  assert.ok(computerSide);
  assert.deepEqual(computerSide, { kind: "computer" });
});

test("every real player appears exactly once across the whole round", () => {
  const players = ids(9);
  const result = generateRound1Pairings(players, ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;

  const seenIds = result.pairings.flatMap((p) => [p.sideA, p.sideB]).flatMap((side) => (side.kind === "player" ? [side.participantId] : []));
  assert.deepEqual([...seenIds].sort(), [...players].sort());
  assert.equal(new Set(seenIds).size, seenIds.length, "no player id should repeat");
});

test("no self-match — a pairing's two sides are always different", () => {
  const result = generateRound1Pairings(ids(20), ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  for (const pairing of result.pairings) {
    const aId = pairing.sideA.kind === "player" ? pairing.sideA.participantId : "computer";
    const bId = pairing.sideB.kind === "player" ? pairing.sideB.participantId : "computer";
    assert.notEqual(aId, bId);
  }
});

test("an injected random source produces fully deterministic, reproducible pairings", () => {
  const players = ids(8);
  let callCount = 0;
  const sequence = [0.9, 0.1, 0.5, 0.3, 0.7, 0.2, 0.8, 0.05];
  const fixedRandom = () => sequence[callCount++ % sequence.length];

  const first = generateRound1Pairings(players, fixedRandom);
  callCount = 0;
  const second = generateRound1Pairings(players, fixedRandom);

  assert.deepEqual(first, second);
});

test("fewer than 2 real participants returns not-enough-participants (0 and 1)", () => {
  assert.deepEqual(generateRound1Pairings([], ZERO_RANDOM), { status: "not-enough-participants" });
  assert.deepEqual(generateRound1Pairings(["only-one"], ZERO_RANDOM), { status: "not-enough-participants" });
});

test("duplicate ids in the input are deduped before pairing (never double-booked)", () => {
  const result = generateRound1Pairings(["a", "a", "b", "c"], ZERO_RANDOM);
  assert.equal(result.status, "ok");
  if (result.status !== "ok") return;
  const seenIds = result.pairings.flatMap((p) => [p.sideA, p.sideB]).flatMap((side) => (side.kind === "player" ? [side.participantId] : []));
  assert.deepEqual([...seenIds].sort(), ["a", "b", "c"]);
});
