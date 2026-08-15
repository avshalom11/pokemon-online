import "server-only";

import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import { getIncubatorDefinition } from "@/features/eggs/data/incubator-definitions";
import type { IncubationProgressSummary } from "@/features/eggs/types/egg.types";
import { prisma } from "@/lib/db/prisma";
import type { PlayerEggIncubation, Prisma } from "@/lib/generated/prisma/client";
import type { PokemonRarity } from "@/shared/types/pokemon";

export type StartIncubationResult =
  | { status: "started"; incubation: PlayerEggIncubation }
  | { status: "egg-not-found" }
  | { status: "incubator-not-found" }
  | { status: "egg-already-incubating" }
  | { status: "incubator-occupied" };

// Assigns one owned egg to one incubator, starting its incubation — the one
// write path for the persistence layer this phase adds (Phase 3 is what
// later increments `battleProgress`; nothing here does that). Runs inside a
// transaction and explicitly checks both "is this egg already incubating"
// and "does this incubator already hold an egg" before writing, so a
// caller gets a clean, typed rejection instead of a raw constraint-
// violation error — but the real backstop against a racing/retried call is
// still the schema itself: PlayerEggIncubation.ownedEggId is its own
// primary key (a second row for the same egg is a PK collision) and
// incubatorId carries its own @@unique (a second row for the same
// incubator violates that unique index) — see that model's own doc comment
// in prisma/schema.prisma. Neither ownership check trusts the caller: both
// the egg and the incubator must actually belong to `playerId`.
//
// `requiredBattleTarget` is computed once here, from the egg's own rarity
// (features/eggs/data/egg-definitions.ts's requiredBattlesStandard) divided
// by the incubator's own speedMultiplier at this exact moment
// (features/eggs/data/incubator-definitions.ts) — Standard's multiplier is
// 1, so this is exactly 400/600/1000/1500 today, with the formula already
// in place for a future faster incubator to produce a smaller target
// without any schema change.
export async function startIncubatingEgg(
  playerId: string,
  incubatorId: string,
  ownedEggId: string
): Promise<StartIncubationResult> {
  return prisma.$transaction(async (tx) => {
    const egg = await tx.playerOwnedEgg.findUnique({ where: { id: ownedEggId } });
    if (!egg || egg.playerId !== playerId) return { status: "egg-not-found" };

    const incubator = await tx.playerIncubator.findUnique({ where: { id: incubatorId } });
    if (!incubator || incubator.playerId !== playerId) return { status: "incubator-not-found" };

    const existingForEgg = await tx.playerEggIncubation.findUnique({ where: { ownedEggId } });
    if (existingForEgg) return { status: "egg-already-incubating" };

    const existingForIncubator = await tx.playerEggIncubation.findUnique({ where: { incubatorId } });
    if (existingForIncubator) return { status: "incubator-occupied" };

    const eggDefinition = getEggDefinition(egg.rarity as PokemonRarity);
    const incubatorDefinition = getIncubatorDefinition(incubator.incubatorTypeId);
    const requiredBattleTarget = Math.max(
      1,
      Math.ceil(eggDefinition.requiredBattlesStandard / incubatorDefinition.speedMultiplier)
    );

    const incubation = await tx.playerEggIncubation.create({
      data: { ownedEggId, incubatorId, requiredBattleTarget },
    });

    return { status: "started", incubation };
  });
}

// Every active incubation belonging to the player — reached via the owning
// incubator (there is no direct playerId column on PlayerEggIncubation, see
// its own doc comment), so this stays correct with no schema change even
// once a player can own more than one incubator.
export async function listActiveIncubations(playerId: string): Promise<PlayerEggIncubation[]> {
  return prisma.playerEggIncubation.findMany({
    where: { incubator: { playerId } },
    orderBy: { startedAt: "asc" },
  });
}

export async function getActiveIncubationForIncubator(incubatorId: string): Promise<PlayerEggIncubation | null> {
  return prisma.playerEggIncubation.findUnique({ where: { incubatorId } });
}

// EGGS PHASE 3 — the one write path for `battleProgress`. Called from
// inside battle-session.service.ts's syncWildHp, the exact same
// wildDefeatRewardGranted-guarded transaction that already grants XP/
// currency/egg-drop for a confirmed wild-defeat victory — so a
// racing/retried call for the same kill can never progress incubation
// twice: that guard already prevents this function from running twice for
// one victory, the exact same idempotency Phase 2's egg-drop roll already
// relies on, no separate mechanism needed here.
//
// Deliberately loops over EVERY active incubation this player owns (via
// listActiveIncubations's own tx-scoped query below), never just "the one
// incubator" — today that's always at most one row (Phase 1: every player
// has exactly one Standard Incubator), but nothing here assumes that stays
// true. Each incubation's own increment comes from its OWNING incubator's
// speedMultiplier (features/eggs/data/incubator-definitions.ts), read fresh
// per incubation rather than hardcoded — Standard's multiplier is 1, so
// this is +1 today, and a future x2 incubator changes only that one
// definition-layer number, never this loop or the schema.
//
// Capped at `requiredBattleTarget` via Math.min: an already-ready
// incubation (battleProgress already at or past target) receives a
// harmless no-op update that leaves it exactly at target, never pushed
// past it — 399/400 + a victory lands at exactly 400/400, and a further
// victory after that stays at 400/400, never 401/400. Never auto-hatches:
// nothing here reads or changes anything about the egg itself once it's
// ready, it just stays "ready" (isIncubationReady) until a future
// Hatchery-phase action consumes it.
export async function progressActiveIncubations(
  tx: Prisma.TransactionClient,
  playerId: string
): Promise<IncubationProgressSummary[]> {
  const activeIncubations = await tx.playerEggIncubation.findMany({ where: { incubator: { playerId } } });

  const summaries: IncubationProgressSummary[] = [];
  for (const incubation of activeIncubations) {
    const incubator = await tx.playerIncubator.findUnique({ where: { id: incubation.incubatorId } });
    if (!incubator) continue; // Unreachable under a real FK constraint — defensive only.

    const definition = getIncubatorDefinition(incubator.incubatorTypeId);
    const nextProgress = Math.min(incubation.requiredBattleTarget, incubation.battleProgress + definition.speedMultiplier);

    const updated = await tx.playerEggIncubation.update({
      where: { ownedEggId: incubation.ownedEggId },
      data: { battleProgress: nextProgress },
    });

    summaries.push({
      incubationId: updated.ownedEggId,
      battleProgress: updated.battleProgress,
      requiredBattleTarget: updated.requiredBattleTarget,
      isReady: isIncubationReady(updated),
    });
  }

  return summaries;
}

// "Ready" is deliberately never a stored column (see PlayerEggIncubation's
// own doc comment) — always this one derivation, so it can never drift out
// of sync with the two numbers that actually define it. Phase 1 never
// produces a `battleProgress >= requiredBattleTarget` row on its own (only
// Phase 3's battle-progress increments ever will), but the derivation
// itself belongs here now so nothing downstream reinvents it later.
export function isIncubationReady(incubation: Pick<PlayerEggIncubation, "battleProgress" | "requiredBattleTarget">): boolean {
  return incubation.battleProgress >= incubation.requiredBattleTarget;
}
