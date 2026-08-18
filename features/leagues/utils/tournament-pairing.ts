// GYMS & LEAGUES PHASE 5 — pure Round-1 pairing generation (section 8/12 of
// this Phase's spec). Deliberately decoupled from Prisma: takes only the
// registered real players' own opaque participant ids and an injectable
// random source, returns a plain pairing plan — the persistence layer
// (league-tournament.service.ts) is the only thing that ever turns this
// into LeagueTournamentParticipant/LeagueTournamentMatch rows. No
// ranking/seeding — uniform random shuffle only, per this Phase's own
// scope.

export type PairingSide = { readonly kind: "player"; readonly participantId: string } | { readonly kind: "computer" };

export interface GeneratedPairing {
  readonly slot: number;
  readonly sideA: PairingSide;
  readonly sideB: PairingSide;
}

export type GenerateRound1PairingsResult =
  | { readonly status: "ok"; readonly pairings: readonly GeneratedPairing[] }
  | { readonly status: "not-enough-participants" };

// Fisher-Yates shuffle over the injected random source — the same
// test-determinism seam every other dice roll in this codebase already
// uses (engine/damage/random.ts, resolveNpcTeamLevels, ...): production
// callers omit it (defaults to Math.random), tests pass a fixed function
// for reproducible pairings.
function shuffle<T>(items: readonly T[], randomSource: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(randomSource() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

// Generates Round 1 pairings from every registered real player's own
// participant id. Requirements this satisfies directly from its
// construction (never a separate validation pass):
//   - every real participant appears at MOST once — duplicates are
//     deduped up front, and the shuffle-then-consecutive-chunk approach
//     can never place the same id into two different pairs.
//   - no self-match — sideA and sideB of a pair are always two distinct
//     array positions holding distinct (deduped) ids.
//   - odd count -> exactly one computer filler side, appended once after
//     the shuffle, so it always pairs with whichever real player the
//     shuffle placed last (still uniformly random, since the whole list
//     was shuffled first).
//   - resulting match count = ceil(realPlayers / 2).
export function generateRound1Pairings(
  realParticipantIds: readonly string[],
  randomSource: () => number = Math.random
): GenerateRound1PairingsResult {
  const uniqueIds = [...new Set(realParticipantIds)];
  if (uniqueIds.length < 2) {
    return { status: "not-enough-participants" };
  }

  const shuffled = shuffle(uniqueIds, randomSource);
  const sides: PairingSide[] = shuffled.map((participantId) => ({ kind: "player", participantId }));

  // Do not create more than one filler for a round (section 8).
  if (sides.length % 2 === 1) {
    sides.push({ kind: "computer" });
  }

  const pairings: GeneratedPairing[] = [];
  for (let i = 0; i < sides.length; i += 2) {
    pairings.push({ slot: pairings.length, sideA: sides[i], sideB: sides[i + 1] });
  }

  return { status: "ok", pairings };
}
