// The game's two currencies. "money" is the common, high-drop-chance one —
// it maps to PlayerProfile.coins (see prisma/schema.prisma; "coins" was
// already this column's established name before this feature existed,
// kept as-is rather than renamed via migration purely for a label match).
// "gold" is the rare, low-drop-chance one and maps 1:1 to
// PlayerProfile.gold. Never add a third value here without also updating
// grantCurrencyRewards's own type -> column mapping
// (features/currency/services/currency-reward.service.ts).
export type CurrencyType = "money" | "gold";

// One resolved reward instance — the result of a single successful roll,
// never a request/intent. Amount is always a positive integer by the time
// one of these exists (see rollCurrencyReward).
export interface CurrencyReward {
  type: CurrencyType;
  amount: number;
}

// One currency's own tunable balance knobs for a given reward source.
// dropChance is a 0..1 probability that this currency drops *at all* for
// that source; minAmount/maxAmount (inclusive) bound the amount rolled
// when it does. Two currencies are rolled fully independently of each
// other (see rollCurrencyReward's own doc comment) — that's what makes
// "only money", "only gold", "both", or "neither" all reachable outcomes
// from the same event.
export interface CurrencyRewardRange {
  dropChance: number;
  minAmount: number;
  maxAmount: number;
}
