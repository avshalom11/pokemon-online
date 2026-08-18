// GYMS & LEAGUES PHASE 9 (section 17) — the ONE place League match-status/
// resolution-reason Hebrew copy lives, same "no caller re-derives the
// wording" convention features/gyms/data/gym-labels.ts already established.
// Pure string tables — no DB, no framework — so both the bracket view
// service (league-bracket-view.service.ts, which decides WHICH status a
// match is currently in) and any focused test can import this without
// pulling in Prisma.

export type LeagueMatchDisplayStatus = "not-open-yet" | "waiting" | "active" | "completed" | "no-show" | "timeout";

// Exact mapping from this Phase's own spec (section 17) — never re-worded
// elsewhere.
export function leagueMatchStatusLabelHe(status: LeagueMatchDisplayStatus): string {
  switch (status) {
    case "not-open-yet":
      return "הקרב עדיין לא נפתח";
    case "waiting":
      return "ממתין ליריב";
    case "active":
      return "הקרב מתנהל";
    case "completed":
      return "הקרב הסתיים";
    case "no-show":
      return "ניצחון עקב אי-הגעה";
    case "timeout":
      return "הקרב הוכרע בסיום הזמן";
  }
}

// The Hebrew name shown in place of a computer-filler participant — never a
// raw participant/player id (section 18).
export function leagueComputerParticipantLabelHe(): string {
  return "שחקן מחשב";
}

// Friendly text for a completed match's own resolutionReason column
// (league-tiebreak.ts's own reason strings, plus the two no-show reasons
// resolveExpiredLeagueMatch produces) — null for a normal, on-time battle
// finish, where no special explanation is needed.
export function leagueResolutionReasonLabelHe(reason: string | null): string | null {
  switch (reason) {
    case "opponent-no-show":
      return "היריב לא הגיע לקרב בזמן";
    case "random-no-show":
      return "אף שחקן לא הגיע לקרב — הניצחון הוכרע באקראי";
    case "timeout-living-pokemon":
      return "הוכרע בתום הזמן לפי מספר הפוקימונים החיים";
    case "timeout-player-level":
      return "הוכרע בתום הזמן לפי רמת השחקן";
    case "timeout-first-entry":
      return "הוכרע בתום הזמן לפי מועד הכניסה לקרב";
    case "timeout-deterministic-fallback":
      return "הוכרע באופן טכני לאחר תיקו מלא";
    default:
      return null;
  }
}

// GENERIC ROUND LABELING (section 17) — never hardcoded per League: derived
// purely from the round's own distance from the LATEST round currently
// persisted for this tournament. Self-corrects every time a new round is
// generated (the match page's own self-resolve-on-access flow already
// re-renders this fresh on every visit) — a round shown as "חצי גמר" while
// round 2 was still the latest existing round becomes "רבע גמר" the moment
// round 3 is generated, and the true Final is only ever labeled once it
// really is the latest round.
export function leagueRoundLabelHe(roundNumber: number, maxRoundNumber: number): string {
  const roundsFromEnd = maxRoundNumber - roundNumber;
  if (roundsFromEnd === 0) return "גמר";
  if (roundsFromEnd === 1) return "חצי גמר";
  if (roundsFromEnd === 2) return "רבע גמר";
  return roundNumber === 1 ? "סיבוב ראשון" : `סיבוב ${roundNumber}`;
}
