// NEW PLAYER STARTING BALANCE — the one place these two numbers are
// tuned. Read ONLY by lib/auth/player-profile.ts's ensurePlayerProfile,
// and only inside its upsert's `create` branch — a brand-new
// PlayerProfile row is created exactly once per account (see that
// function's own doc comment on the upsert/self-heal design), so this
// grant can never re-apply on a later login, and never retroactively
// changes an already-existing player's balance (their row's `update`
// branch never touches coins/gold). Deliberately separate from every
// reward/drop config (field-battle-currency-reward-config.ts, egg/chest
// drop configs, etc.) — this is a one-time account-creation grant, not a
// reward source.
export const STARTING_MONEY = 2000;
export const STARTING_GOLD = 50;
