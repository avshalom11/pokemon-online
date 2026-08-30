// PLAYER LEVEL ACCESS REQUIREMENTS — the ONE source of truth for the
// Marketplace minimum player level gate. Every check anywhere in the
// codebase must import this constant rather than hardcoding 5 a second
// time — same "one central constant, reused everywhere" convention
// features/gyms/config/gym-access-rules.config.ts already establishes for
// Gyms. Applies uniformly to every Marketplace operation (viewing, buying,
// creating, editing, cancelling) — there is no per-operation override.
export const MIN_MARKETPLACE_PLAYER_LEVEL = 5;
