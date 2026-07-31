import "server-only";

import { FIELD_BATTLE_CURRENCY_REWARD_CONFIG } from "@/features/currency/config/field-battle-currency-reward-config";
import { fieldBattleCurrencyRewardMessage } from "@/features/currency/messages/field-battle-currency-messages";
import { grantCurrencyRewards, rollCurrencyReward } from "@/features/currency/services/currency-reward.service";
import type { CurrencyReward } from "@/features/currency/types/currency.types";
import { createNotification } from "@/features/notifications/services/notification-service";
import type { Prisma } from "@/lib/generated/prisma/client";

// The one field-battle-specific entry point into the currency/reward
// system — everything it delegates to (rollCurrencyReward,
// grantCurrencyRewards) is the generic, source-agnostic half
// (currency-reward.service.ts), reusable as-is by a future reward source
// with its own config; only this file knows the source is "defeated a
// wild Pokémon in a field battle".
//
// Called from exactly one place: battle-session.service.ts's syncWildHp,
// inside the SAME transaction — and only the branch already gated by
// `wildDefeatRewardGranted: false` (a confirmed, exactly-once wild-defeat
// victory — the identical guard the player-XP and Pokémon-XP rewards
// already rely on). That guard is what makes escaping, losing, capturing,
// and refreshing all correctly grant nothing: none of those paths ever
// reach this function at all, and a racing/retried request for the same
// kill can't reach it a second time either. Money and gold are rolled
// fully independently (see rollCurrencyReward), so the possible outcomes
// are exactly "only money", "only gold", "both", or "neither" — never
// forced together.
export async function grantFieldBattleCurrencyRewards(
  tx: Prisma.TransactionClient,
  playerId: string,
  defeatedWildPokemonName: string,
  randomSource: () => number = Math.random
): Promise<CurrencyReward[]> {
  const rewards = (
    [
      rollCurrencyReward("money", FIELD_BATTLE_CURRENCY_REWARD_CONFIG.money, randomSource),
      rollCurrencyReward("gold", FIELD_BATTLE_CURRENCY_REWARD_CONFIG.gold, randomSource),
    ] as const
  ).filter((reward): reward is CurrencyReward => reward !== null);

  if (rewards.length === 0) return rewards;

  await grantCurrencyRewards(tx, playerId, rewards);

  // One notification per reward (never a combined "you got money and
  // gold" message) — if both currencies drop, the player sees two
  // separate entries in the bell, each with its own randomly-picked
  // wording.
  for (const reward of rewards) {
    const notificationType = reward.type === "money" ? "CURRENCY_MONEY_REWARD" : "CURRENCY_GOLD_REWARD";
    const message = fieldBattleCurrencyRewardMessage(defeatedWildPokemonName, reward, randomSource);
    await createNotification(tx, playerId, notificationType, message);
  }

  return rewards;
}
