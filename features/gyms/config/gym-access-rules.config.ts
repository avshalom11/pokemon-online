// GYMS & LEAGUES PHASE 4 — the ONE source of truth for the global Gym
// minimum player level gate (section 1 of this Phase's spec). Every check
// anywhere in the codebase must import this constant rather than
// hardcoding 10 a second time. Applies uniformly to every Gym AND every
// Regional Champion battle — there is no per-region or per-slot override.
export const MIN_GYM_PLAYER_LEVEL = 10;
