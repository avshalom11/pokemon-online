import "server-only";

import { calculatePokemonHpStat } from "@/engine/battle/pokemon-stat-calculations";
import { getInventoryItemQuantity, removeInventoryItem } from "@/features/inventory/services/inventory.service";
import { isMedicineTargetEligible } from "@/features/battle/services/medicine-target-eligibility";
import { getShopItemById } from "@/features/shop/services/shop-catalog.service";
import type { MajorStatus } from "@/features/battle/status/major-status";
import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import { applyNpcFreeStrike } from "./gym-battle-solo-strike.service";
import {
  getNpcBattleSession,
  getParticipatingParty,
  guardedSessionUpdate,
  isActiveParticipantFainted,
  parseNpcBattleHpMap,
  parseNpcBattleParticipantIds,
  parseNpcBattleStatusMap,
  StaleNpcBattleSessionError,
  statusFor,
  syncParticipantToRealPokemon,
} from "./gym-battle-session.service";

// BAG DURING GYM BATTLE (later task, section 4). Reuses the EXACT same
// real inventory ownership/consumption primitives (removeInventoryItem,
// getInventoryItemQuantity) and the same Shop item catalog
// (medicineEffectKind/healPercent/curesStatus) applyMedicineItemUse
// (features/battle/services/use-medicine.service.ts) already uses for
// outside-of-battle healing — never a second, Gym-specific item table, and
// never a duplicated heal-amount formula. STATUS-HEALING ITEMS (Antidote/
// Burn Heal/Paralyze Heal/Awakening/Ice Heal/Full Heal) reuse
// isMedicineTargetEligible for the exact same eligibility rule
// applyMedicineItemUse itself uses — the ONE source of truth for "what a
// status medicine cures" and "is this target valid," never re-derived here.
// What's genuinely different in THIS file: the target must be a
// PARTICIPATING Pokémon in the live Gym battle (never an arbitrary owned
// Pokémon), the effect is applied to the battle's own LIVE state — HP via
// session.playerBattleHp (HP persistence, section 9), status via session.
// playerBattleStatus (mirrors that same pattern for status — see
// gym-battle-session.service.ts's own NpcBattleParticipantStatus doc
// comment) — inside the SAME transaction as the item consumption, and
// using the item consumes the player's turn exactly like a voluntary
// switch does — the NPC opponent gets one free strike afterward
// (gym-battle-solo-strike.service.ts, shared with voluntary switch).

export type UseGymBattleItemResult =
  | {
      status: "success";
      itemName: string;
      newHp: number;
      remainingQuantity: number;
      battleEnded: boolean;
      winner: "player" | "npc" | null;
      victoryCompleted: boolean;
      // ATTACK SOUND (later task, section 3) — same meaning as
      // VoluntarySwitchResult's own npcAttacked: true only when the NPC's
      // free-strike response actually resolved an attack; never true for
      // the item use itself.
      npcAttacked: boolean;
      // STATUS-HEALING ITEMS — the MajorStatus actually cleared by this
      // use, or null for an ordinary heal/revive. Same meaning as
      // MedicineItemUseResult's own curedStatus (use-medicine.service.ts).
      curedStatus: MajorStatus | null;
    }
  | { status: "no-session" }
  | { status: "invalid-item" }
  | { status: "not-participant" }
  | { status: "not-owned" }
  | { status: "no-item" }
  | { status: "invalid-target" }
  // BAG / VOLUNTARY SWITCH — PLAYER TURN ONLY (GYM BATTLE POLISH task,
  // section 2) — the currently-active participant has already fainted;
  // the only valid action right now is the separate, free forced-
  // replacement flow, never a Bag item.
  | { status: "forced-replacement-pending" }
  // TURN SAFETY / RACE GUARD (same task) — this item's effect was computed
  // off a session snapshot another action already mutated since; nothing
  // was written (no consumption, no HP/status change).
  | { status: "stale-action" };

export async function useGymBattleItem(playerId: string, itemId: string, targetPlayerPokemonId: string): Promise<UseGymBattleItemResult> {
  const item = getShopItemById(itemId);
  if (!item || item.categoryId !== "potions" || !item.medicineEffectKind) {
    return { status: "invalid-item" };
  }

  const isCureStatus = item.medicineEffectKind === "cure-status";
  // Each kind sets exactly the field it needs — see ShopItem.curesStatus's
  // own doc comment, same rule applyMedicineItemUse enforces.
  if (isCureStatus && !item.curesStatus) return { status: "invalid-item" };
  if (!isCureStatus && item.healPercent === undefined) return { status: "invalid-item" };

  const session = await getNpcBattleSession(playerId);
  if (!session) return { status: "no-session" };
  if (isActiveParticipantFainted(session)) return { status: "forced-replacement-pending" };

  const participantIds = parseNpcBattleParticipantIds(session.playerPokemonIds);
  if (!participantIds.includes(targetPlayerPokemonId)) {
    return { status: "not-participant" };
  }

  const participants = await getParticipatingParty(playerId, session);
  const target = participants.find((pokemon) => pokemon.id === targetPlayerPokemonId);
  if (!target) return { status: "not-owned" };

  const playerBattleHp = parseNpcBattleHpMap(session.playerBattleHp);
  const currentHp = playerBattleHp[target.id] ?? target.currentHp;
  // The target's LIVE in-battle status — session.playerBattleStatus, never
  // target.status (the possibly-stale PlayerPokemon row, only synced back
  // at checkpoints like this one — see syncParticipantToRealPokemon calls
  // below), exactly mirroring how currentHp above reads playerBattleHp
  // rather than target.currentHp.
  const playerBattleStatus = parseNpcBattleStatusMap(session.playerBattleStatus);
  const liveStatus = statusFor(playerBattleStatus, target.id).status;

  // THE single eligibility rule, shared with Field Battle's Bag
  // (BattleBagPanel.tsx) and applyMedicineItemUse's own server-side
  // re-check — never re-derived here. Covers fainted-vs-not for
  // heal/revive AND the full status-match rule for cure-status in one
  // place, driven entirely by medicineEffectKind/curesStatus.
  if (!isMedicineTargetEligible(item, { currentHp, status: liveStatus })) {
    return { status: "invalid-target" };
  }

  // STATUS-HEALING ITEMS — a distinct branch, never reusing the HP-based
  // heal/revive math below (there is no HP change at all here).
  if (isCureStatus) {
    // Eligibility above already guarantees liveStatus is a real MajorStatus
    // matching curesStatus (or curesStatus === "all").
    const curedStatus = liveStatus as MajorStatus;

    try {
      return await prisma.$transaction(async (tx) => {
        const removed = await removeInventoryItem(tx, playerId, itemId, 1);
        if (!removed) return { status: "no-item" };
        const remainingQuantity = await getInventoryItemQuantity(tx, playerId, itemId);

        const nextPlayerBattleStatus = { ...playerBattleStatus, [target.id]: { status: null, turnsRemaining: null } };
        // TURN SAFETY / RACE GUARD — the FIRST session write of this
        // action, guarded by the exact `updatedAt` read above, same
        // convention the heal/revive path below already establishes.
        await guardedSessionUpdate(tx, playerId, session.updatedAt, {
          playerBattleStatus: nextPlayerBattleStatus as unknown as Prisma.InputJsonValue,
        });
        // Both cleared together, atomically — same "never leave a stale
        // statusTurnsRemaining behind" rule applyMedicineItemUse's own
        // cure-status branch follows for Sleep.
        await syncParticipantToRealPokemon(tx, target.id, { currentHp, status: null, statusTurnsRemaining: null });

        // TURN CONSUMPTION — a status cure consumes the turn exactly like
        // a heal/revive item use does: the NPC gets one free strike.
        // playerBattleHp is unchanged by this branch, so the session is
        // passed through as-is (no HP override needed, unlike the
        // heal/revive path below).
        const activeParticipant = participants.find((pokemon) => pokemon.id === session.activePlayerPokemonId) ?? target;
        const outcome = await applyNpcFreeStrike(tx, session, activeParticipant);

        return {
          status: "success",
          itemName: item.name,
          newHp: currentHp,
          remainingQuantity,
          battleEnded: outcome.battleEnded,
          winner: outcome.winner,
          victoryCompleted: false,
          npcAttacked: outcome.attacked,
          curedStatus,
        };
      });
    } catch (error) {
      if (error instanceof StaleNpcBattleSessionError) return { status: "stale-action" };
      throw error;
    }
  }

  const maxHp = calculatePokemonHpStat(target.species.baseStats.health, target.level);
  const newHp =
    item.medicineEffectKind === "revive"
      ? Math.min(maxHp, Math.floor(maxHp * item.healPercent!))
      : Math.min(maxHp, currentHp + Math.round(maxHp * item.healPercent!));

  try {
    return await prisma.$transaction(async (tx) => {
      const removed = await removeInventoryItem(tx, playerId, itemId, 1);
      if (!removed) return { status: "no-item" };
      const remainingQuantity = await getInventoryItemQuantity(tx, playerId, itemId);

      const nextPlayerBattleHp = { ...playerBattleHp, [target.id]: newHp };
      // TURN SAFETY / RACE GUARD (GYM BATTLE POLISH task, section 2) — the
      // FIRST session write of this action, guarded by the exact
      // `updatedAt` read above (before this transaction started); throws
      // (rolling back the inventory decrement too) if some other action
      // already mutated the session in between.
      await guardedSessionUpdate(tx, playerId, session.updatedAt, {
        playerBattleHp: nextPlayerBattleHp as unknown as Prisma.InputJsonValue,
      });
      await syncParticipantToRealPokemon(tx, target.id, { currentHp: newHp, status: target.status ?? null, statusTurnsRemaining: target.statusTurnsRemaining ?? null });

      // TURN CONSUMPTION (section 15) — using a Bag item consumes the turn
      // exactly like a voluntary switch does: the NPC opponent gets one free
      // strike, resolved against whichever Pokémon is CURRENTLY active
      // (usually the same one just healed/revived, but a Revive on a
      // non-active fainted participant still leaves the currently-active one
      // as the one who takes the counter-strike).
      const activeParticipant = participants.find((pokemon) => pokemon.id === session.activePlayerPokemonId) ?? target;
      // The just-applied heal/revive must be reflected before resolving the
      // free strike if the active participant IS the target.
      const activeForStrike = activeParticipant.id === target.id ? { ...activeParticipant, currentHp: newHp } : activeParticipant;

      // The free strike is the SECOND write of this same, already-guarded
      // transaction — no interleaving competitor could have appeared once
      // inside it, so it never re-guards against the (now stale) original
      // `session.updatedAt`.
      const outcome = await applyNpcFreeStrike(tx, { ...session, playerBattleHp: nextPlayerBattleHp as unknown as Prisma.JsonValue }, activeForStrike);

      return {
        status: "success",
        itemName: item.name,
        newHp,
        remainingQuantity,
        battleEnded: outcome.battleEnded,
        winner: outcome.winner,
        victoryCompleted: false,
        npcAttacked: outcome.attacked,
        curedStatus: null,
      };
    });
  } catch (error) {
    if (error instanceof StaleNpcBattleSessionError) return { status: "stale-action" };
    throw error;
  }
}
