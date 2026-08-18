// GYMS & LEAGUES PHASE 7 — focused coverage for the pure tie-break
// comparator (TIMEOUT items 13-16). No DB.
import assert from "node:assert/strict";
import { test } from "node:test";

import { rankTiebreakCandidates, resolveTiebreak, type TiebreakCandidate } from "./league-tiebreak.ts";

function candidate(overrides: Partial<TiebreakCandidate> & { participantId: string }): TiebreakCandidate {
  return { livingPokemonCount: 1, playerLevel: 10, enteredAt: new Date("2026-01-01T00:00:00Z"), ...overrides };
}

test("more living Pokémon wins", () => {
  const a = candidate({ participantId: "a", livingPokemonCount: 3 });
  const b = candidate({ participantId: "b", livingPokemonCount: 2 });
  const result = resolveTiebreak(a, b);
  assert.equal(result.winner.participantId, "a");
  assert.equal(result.reason, "timeout-living-pokemon");
});

test("equal living count -> higher Player Level wins", () => {
  const a = candidate({ participantId: "a", livingPokemonCount: 2, playerLevel: 40 });
  const b = candidate({ participantId: "b", livingPokemonCount: 2, playerLevel: 35 });
  const result = resolveTiebreak(a, b);
  assert.equal(result.winner.participantId, "a");
  assert.equal(result.reason, "timeout-player-level");
});

test("equal living + equal level -> earlier entry wins", () => {
  const a = candidate({ participantId: "a", enteredAt: new Date("2026-01-01T00:00:00Z") });
  const b = candidate({ participantId: "b", enteredAt: new Date("2026-01-01T00:05:00Z") });
  const result = resolveTiebreak(a, b);
  assert.equal(result.winner.participantId, "a");
  assert.equal(result.reason, "timeout-first-entry");
});

test("a side that never entered ranks behind one that did, at the entry-time stage", () => {
  const a = candidate({ participantId: "a", enteredAt: null });
  const b = candidate({ participantId: "b", enteredAt: new Date("2026-01-01T00:05:00Z") });
  const result = resolveTiebreak(a, b);
  assert.equal(result.winner.participantId, "b");
  assert.equal(result.reason, "timeout-first-entry");
});

test("an exact tie on every gameplay criterion falls back to a deterministic participant-id comparison", () => {
  const sameTime = new Date("2026-01-01T00:00:00Z");
  const a = candidate({ participantId: "aaa", enteredAt: sameTime });
  const b = candidate({ participantId: "bbb", enteredAt: sameTime });
  const result = resolveTiebreak(a, b);
  assert.equal(result.winner.participantId, "aaa");
  assert.equal(result.reason, "timeout-deterministic-fallback");

  // Order-independent and reproducible.
  const reversed = resolveTiebreak(b, a);
  assert.equal(reversed.winner.participantId, "aaa");
  assert.equal(reversed.reason, "timeout-deterministic-fallback");
});

test("permanent PlayerPokemon.currentHp plays no role — the comparator only ever sees pre-computed livingPokemonCount", () => {
  // Structural guarantee: TiebreakCandidate has no HP-shaped field at all,
  // only a plain count — the comparator itself cannot reach into
  // PlayerPokemon even if it wanted to.
  const a = candidate({ participantId: "a", livingPokemonCount: 1 });
  const b = candidate({ participantId: "b", livingPokemonCount: 0 });
  assert.equal(resolveTiebreak(a, b).winner.participantId, "a");
});

test("rankTiebreakCandidates ranks more than two candidates best-to-worst", () => {
  const candidates = [
    candidate({ participantId: "low", livingPokemonCount: 1 }),
    candidate({ participantId: "high", livingPokemonCount: 3 }),
    candidate({ participantId: "mid", livingPokemonCount: 2 }),
  ];
  const ranked = rankTiebreakCandidates(candidates);
  assert.deepEqual(
    ranked.map((c) => c.participantId),
    ["high", "mid", "low"]
  );
});
