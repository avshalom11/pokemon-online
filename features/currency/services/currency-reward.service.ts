import "server-only";

import type { CurrencyReward, CurrencyRewardRange, CurrencyType } from "@/features/currency/types/currency.types";
import type { Prisma } from "@/lib/generated/prisma/client";

// The generic, reusable half of the currency/reward system — deliberately
// knows nothing about *why* a reward is being rolled or granted (not
// "wild Pokémon defeated", not Hebrew notification text). A future reward
// source (a quest, a daily login bonus, ...) reuses exactly these two
// functions with its own CurrencyRewardRange config, the same way
// field-battle-currency-reward.service.ts (this feature's own field-battle
// orchestrator) does today — see that file for the one place field-battle-
// specific concerns (which Pokémon, which notification wording) live.

// One independent roll for one currency: first an all-or-nothing chance
// check (range.dropChance), then — only on a hit — a uniform amount in
// [minAmount, maxAmount]. Returns null on a miss rather than a
// zero-amount reward, so a caller never has to remember to filter those
// out separately from "didn't roll at all".
//
// randomSource defaults to Math.random but is always overridable — same
// test-determinism seam every dice roll in this codebase already uses
// (see e.g. engine/damage/random.ts) — so reward tests never have to stub
// Math.random globally.
export function rollCurrencyReward(
  type: CurrencyType,
  range: CurrencyRewardRange,
  randomSource: () => number = Math.random
): CurrencyReward | null {
  if (randomSource() >= range.dropChance) return null;

  const span = range.maxAmount - range.minAmount + 1;
  const amount = Math.floor(randomSource() * span) + range.minAmount;

  return { type, amount };
}

// Applies already-rolled rewards to the player's own PlayerProfile row —
// never re-rolls, never validates dropChance/amount bounds itself (that's
// entirely rollCurrencyReward's job; by the time a CurrencyReward exists,
// it's already a done decision). Always takes an existing transaction
// client, same "never opens its own transaction" convention
// addPlayerExperience (features/player-progression/progression-service.ts)
// already established — every current caller grants currency atomically
// alongside another write (claiming the wild-defeat reward), so a
// standalone variant would just invite a caller to skip that atomicity by
// accident.
//
// Prisma's `increment` is used directly rather than a read-then-write
// (unlike addPlayerExperience, which needs the *current* total to derive
// a level) — a currency grant never depends on the balance it's adding
// to, so there's nothing to read first.
export async function grantCurrencyRewards(
  tx: Prisma.TransactionClient,
  playerId: string,
  rewards: readonly CurrencyReward[]
): Promise<void> {
  const moneyAmount = sumByType(rewards, "money");
  const goldAmount = sumByType(rewards, "gold");

  if (moneyAmount === 0 && goldAmount === 0) return;

  await tx.playerProfile.update({
    where: { id: playerId },
    data: {
      ...(moneyAmount > 0 ? { coins: { increment: moneyAmount } } : {}),
      ...(goldAmount > 0 ? { gold: { increment: goldAmount } } : {}),
    },
  });
}

function sumByType(rewards: readonly CurrencyReward[], type: CurrencyType): number {
  return rewards.filter((reward) => reward.type === type).reduce((sum, reward) => sum + reward.amount, 0);
}

// Deducts `amount` of one currency from the player's own PlayerProfile row —
// the spend-side counterpart to grantCurrencyRewards above. The balance
// check and the decrement happen as a single atomic updateMany with the
// precondition encoded directly in its WHERE clause ({ [column]: { gte:
// amount } }), never a separate read-then-check-then-write: two concurrent
// purchase requests racing against the same near-empty balance can never
// both see "sufficient funds" and both succeed, the identical idiom
// battle-session.service.ts's syncWildHp already uses for
// wildDefeatRewardGranted (an updateMany whose WHERE clause is the atomic
// guard, checked via `.count`). Returns false (no row updated — balance
// was too low) rather than throwing, so a caller can show a normal
// "insufficient funds" outcome instead of handling an exception.
export async function spendCurrency(
  tx: Prisma.TransactionClient,
  playerId: string,
  type: CurrencyType,
  amount: number
): Promise<boolean> {
  const column = type === "money" ? "coins" : "gold";

  const updated = await tx.playerProfile.updateMany({
    where: { id: playerId, [column]: { gte: amount } },
    data: { [column]: { decrement: amount } },
  });

  return updated.count > 0;
}
