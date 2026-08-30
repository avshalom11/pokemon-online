// PLAYER LEVEL ACCESS REQUIREMENTS — the ONE source of truth for the
// global League minimum player level gate. Every check anywhere in the
// codebase must import this constant rather than hardcoding 7 a second
// time — same "one central constant, reused everywhere" convention
// features/gyms/config/gym-access-rules.config.ts already establishes for
// Gyms. Applies uniformly to every regional League — there is no
// per-League override (Champions League is never directly registerable
// regardless, so this gate never applies to it).
export const MIN_LEAGUE_PLAYER_LEVEL = 7;
