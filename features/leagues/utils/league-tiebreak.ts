// GYMS & LEAGUES PHASE 7 — pure tie-break comparison, shared by both
// timeout match resolution (section 7-11) and 2nd/3rd-place derivation
// (section 21), so the exact same priority logic is never implemented
// twice. No DB, no Date.now() — every input is already resolved by the
// caller (living-Pokémon count from Phase 6's own battle-local HP map,
// Player Level from the authoritative source the caller chose, entry
// timestamp from Phase 6's own join timestamps).

export interface TiebreakCandidate {
  readonly participantId: string;
  readonly livingPokemonCount: number;
  readonly playerLevel: number;
  // null when this side never entered the battle room at all (section 5's
  // "neither entered" case, or a side eliminated without ever joining).
  readonly enteredAt: Date | null;
}

export type TiebreakReason = "timeout-living-pokemon" | "timeout-player-level" | "timeout-first-entry" | "timeout-deterministic-fallback";

export interface TiebreakResult {
  readonly winner: TiebreakCandidate;
  readonly reason: TiebreakReason;
}

// Priority order (mandatory, section 7-11):
//   1. More living Pokémon (section 8)
//   2. Higher Player Level (section 9)
//   3. Earlier battle-room entry timestamp (section 10) — a side that
//      never entered is always ranked behind one that did.
//   4. Stable participant-id comparison — a deterministic technical
//      fallback ONLY for the theoretical exact-tie case (section 11),
//      never a gameplay rule shown to players.
export function resolveTiebreak(a: TiebreakCandidate, b: TiebreakCandidate): TiebreakResult {
  if (a.livingPokemonCount !== b.livingPokemonCount) {
    return { winner: a.livingPokemonCount > b.livingPokemonCount ? a : b, reason: "timeout-living-pokemon" };
  }

  if (a.playerLevel !== b.playerLevel) {
    return { winner: a.playerLevel > b.playerLevel ? a : b, reason: "timeout-player-level" };
  }

  const aEntered = a.enteredAt?.getTime() ?? null;
  const bEntered = b.enteredAt?.getTime() ?? null;
  if (aEntered !== bEntered) {
    if (aEntered === null) return { winner: b, reason: "timeout-first-entry" };
    if (bEntered === null) return { winner: a, reason: "timeout-first-entry" };
    return { winner: aEntered < bEntered ? a : b, reason: "timeout-first-entry" };
  }

  // Exact tie on every approved gameplay criterion — an impossible/near-
  // impossible edge case, never presented as a real rule. Ascending
  // participant-id comparison is arbitrary but fully deterministic and
  // never leaves a match unresolved.
  return { winner: a.participantId < b.participantId ? a : b, reason: "timeout-deterministic-fallback" };
}

// Ranks any number of eliminated candidates best-to-worst using the exact
// same priority chain, one pairwise comparison at a time — used by 2nd/
// 3rd-place derivation, which may need to rank more than two candidates
// (a "semifinal round" can eliminate more than one real player when the
// bracket briefly had more than 2 real players in play).
export function rankTiebreakCandidates(candidates: readonly TiebreakCandidate[]): TiebreakCandidate[] {
  return [...candidates].sort((a, b) => {
    const { winner } = resolveTiebreak(a, b);
    return winner.participantId === a.participantId ? -1 : 1;
  });
}
