// GYMS & LEAGUES PHASE 1 — approved future Tournament rules, represented
// as data/types/docs ONLY (section 16). None of this is implemented or
// wired up: no PvP matchmaking, no bracket generation, no timeout
// resolution. This file exists purely so Phase 6/7 has one documented,
// approved source to build against instead of re-deriving these rules
// from a design doc.

// Real player-vs-real-player PvP is the default; a computer participant
// may only fill a round with an odd number of real players. Its own
// advancement after winning depends on whether the NEXT round would then
// have an odd or even real-player count.
export interface ComputerFillerRule {
  readonly appliesWhenOddRealPlayerCount: true;
  readonly npcEliminatedIfNextRoundRealPlayerCountIsEven: true;
  readonly npcAdvancesIfNextRoundRealPlayerCountIsOdd: true;
}

export const COMPUTER_FILLER_RULE: ComputerFillerRule = {
  appliesWhenOddRealPlayerCount: true,
  npcEliminatedIfNextRoundRealPlayerCountIsEven: true,
  npcAdvancesIfNextRoundRealPlayerCountIsOdd: true,
};

// Timeout/tiebreak resolution (Phase 7) — evaluated TOP TO BOTTOM; the
// first rule that applies decides the round's outcome.
export type TournamentTimeoutRule =
  | "actual-winner"
  | "only-one-player-entered"
  | "neither-player-entered-random-winner"
  | "still-active-more-living-pokemon-wins"
  | "still-active-tie-higher-player-level-wins"
  | "still-active-tie-entered-battle-room-first-wins";

export const TOURNAMENT_TIMEOUT_RULE_PRIORITY: readonly TournamentTimeoutRule[] = [
  // 1. The battle actually finished — its real winner stands.
  "actual-winner",
  // 2. Only one of the two players entered the battle room within the
  //    20-minute window (LEAGUE_SCHEDULE.battleRoomActiveWindowMinutes) —
  //    that player wins by default.
  "only-one-player-entered",
  // 3. Neither player entered — a random winner is chosen.
  "neither-player-entered-random-winner",
  // 4. The battle is still active when the next round's start time
  //    arrives — the player with more living Pokémon wins.
  "still-active-more-living-pokemon-wins",
  // 5. Same living-Pokémon count — the higher Player Level wins.
  "still-active-tie-higher-player-level-wins",
  // 6. Same Player Level too — whoever entered the battle room first wins.
  "still-active-tie-entered-battle-room-first-wins",
];
