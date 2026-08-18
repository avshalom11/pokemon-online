import "server-only";

import { prisma } from "@/lib/db/prisma";
import type { Prisma } from "@/lib/generated/prisma/client";
import type { RegionId } from "@/shared/types/region";
import { GYM_BATTLE_SLOT_ORDER } from "../data/gym-registry";
import { getPreviousRegionInGymSequence } from "../data/region-gym-sequence";
import {
  battleSlotKey,
  isGymBattleUnlocked as isGymBattleUnlockedPure,
  isGymUnlocked as isGymUnlockedPure,
  isRegionalChampionUnlocked as isRegionalChampionUnlockedPure,
  type RegionGymProgressSnapshot,
} from "./gym-progression-rules";
import type { GymBattleSlotId } from "../types/gym.types";

// GYMS & LEAGUES PHASE 1 — the DB-backed read/write surface for Gym/
// Regional Champion progression. Every unlock/completion RULE itself lives
// in gym-progression-rules.ts (pure, no Prisma) — this file's only job is
// fetching the minimum rows needed to build a snapshot and delegating to
// that pure logic, so there is exactly one implementation of "is Gym 2
// unlocked" anywhere in the codebase. NOT wired to any battle yet — Phase
// 2/3 is the only future caller of the mutation primitives below.

const GYM_NUMBERS: readonly (1 | 2 | 3)[] = [1, 2, 3];

async function buildSnapshot(playerId: string, regionId: RegionId): Promise<RegionGymProgressSnapshot> {
  const rows = await prisma.playerGymBattleProgress.findMany({
    where: { playerId, regionId },
    select: { gymNumber: true, battleSlot: true },
  });

  const completedBattleSlots = new Set(
    rows.map((row) => battleSlotKey(row.gymNumber as 1 | 2 | 3, row.battleSlot as GymBattleSlotId))
  );

  return { completedBattleSlots };
}

// ---- Reads --------------------------------------------------------------

export async function isGymUnlocked(playerId: string, regionId: RegionId, gymNumber: 1 | 2 | 3): Promise<boolean> {
  const snapshot = await buildSnapshot(playerId, regionId);
  return isGymUnlockedPure(snapshot, gymNumber);
}

export async function isGymBattleUnlocked(
  playerId: string,
  regionId: RegionId,
  gymNumber: 1 | 2 | 3,
  battleSlot: GymBattleSlotId
): Promise<boolean> {
  const snapshot = await buildSnapshot(playerId, regionId);
  return isGymBattleUnlockedPure(snapshot, gymNumber, battleSlot);
}

export async function isGymBattleCompleted(
  playerId: string,
  regionId: RegionId,
  gymNumber: 1 | 2 | 3,
  battleSlot: GymBattleSlotId
): Promise<boolean> {
  const row = await prisma.playerGymBattleProgress.findUnique({
    where: { playerId_regionId_gymNumber_battleSlot: { playerId, regionId, gymNumber, battleSlot } },
    select: { id: true },
  });
  return row !== null;
}

export async function isRegionalChampionUnlocked(playerId: string, regionId: RegionId): Promise<boolean> {
  const snapshot = await buildSnapshot(playerId, regionId);
  return isRegionalChampionUnlockedPure(snapshot);
}

export async function isRegionalChampionDefeated(playerId: string, regionId: RegionId): Promise<boolean> {
  const row = await prisma.playerRegionalChampionProgress.findUnique({
    where: { playerId_regionId: { playerId, regionId } },
    select: { id: true },
  });
  return row !== null;
}

export async function hasBadge(playerId: string, regionId: RegionId, gymNumber: 1 | 2 | 3): Promise<boolean> {
  const row = await prisma.playerGymBadge.findUnique({
    where: { playerId_regionId_gymNumber: { playerId, regionId, gymNumber } },
    select: { id: true },
  });
  return row !== null;
}

// SEQUENTIAL REGION GYM PROGRESSION (Phase 4, section 2) — true for Kanto
// (no previous region to gate on) or once the immediately-previous region's
// Regional Champion has been defeated; false otherwise. This is the ONLY
// place a "previous region" conditional is ever evaluated — every start-
// validation caller goes through this single function rather than
// re-deriving the previous region itself.
export async function isRegionGymSequenceUnlocked(playerId: string, regionId: RegionId): Promise<boolean> {
  const previousRegionId = getPreviousRegionInGymSequence(regionId);
  if (!previousRegionId) return true;
  return isRegionalChampionDefeated(playerId, previousRegionId);
}

export async function hasRegionalMedal(playerId: string, regionId: RegionId): Promise<boolean> {
  const row = await prisma.playerRegionalMedal.findUnique({
    where: { playerId_regionId: { playerId, regionId } },
    select: { id: true },
  });
  return row !== null;
}

// A full per-region snapshot for a future Gym screen — one round trip
// (Promise.all) rather than the caller re-deriving it from several of the
// single-question reads above.
export interface GymBattleProgressView {
  readonly battleSlot: GymBattleSlotId;
  readonly unlocked: boolean;
  readonly completed: boolean;
}

export interface GymProgressView {
  readonly gymNumber: 1 | 2 | 3;
  readonly unlocked: boolean;
  readonly badgeEarned: boolean;
  readonly battles: readonly GymBattleProgressView[];
}

export interface RegionGymProgress {
  readonly regionId: RegionId;
  readonly gyms: readonly [GymProgressView, GymProgressView, GymProgressView];
  readonly regionalChampionUnlocked: boolean;
  readonly regionalChampionDefeated: boolean;
  readonly regionalMedalEarned: boolean;
}

export async function getRegionGymProgress(playerId: string, regionId: RegionId): Promise<RegionGymProgress> {
  const [snapshot, badgeRows, championRow, medalRow] = await Promise.all([
    buildSnapshot(playerId, regionId),
    prisma.playerGymBadge.findMany({ where: { playerId, regionId }, select: { gymNumber: true } }),
    prisma.playerRegionalChampionProgress.findUnique({
      where: { playerId_regionId: { playerId, regionId } },
      select: { id: true },
    }),
    prisma.playerRegionalMedal.findUnique({ where: { playerId_regionId: { playerId, regionId } }, select: { id: true } }),
  ]);

  const badgedGymNumbers = new Set(badgeRows.map((row) => row.gymNumber));

  const gyms = GYM_NUMBERS.map((gymNumber) => ({
    gymNumber,
    unlocked: isGymUnlockedPure(snapshot, gymNumber),
    badgeEarned: badgedGymNumbers.has(gymNumber),
    battles: GYM_BATTLE_SLOT_ORDER.map((battleSlot) => ({
      battleSlot,
      unlocked: isGymBattleUnlockedPure(snapshot, gymNumber, battleSlot),
      completed: snapshot.completedBattleSlots.has(battleSlotKey(gymNumber, battleSlot)),
    })),
  })) as unknown as [GymProgressView, GymProgressView, GymProgressView];

  return {
    regionId,
    gyms,
    regionalChampionUnlocked: isRegionalChampionUnlockedPure(snapshot),
    regionalChampionDefeated: championRow !== null,
    regionalMedalEarned: medalRow !== null,
  };
}

// ---- Mutations (idempotent) ---------------------------------------------
// Every primitive below takes a caller-supplied transaction client (same
// convention as addPlayerExperience/grantBattlePokemonXp) since Phase 2/3
// will always call these atomically alongside the battle resolution that
// triggered them. Not wired to any battle yet.

function isUniqueConstraintViolation(error: unknown): boolean {
  return typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "P2002";
}

// Marks one Gym trainer battle as permanently won. Idempotent — but unlike
// Phase 1/3 (which only needed idempotency, never needed to KNOW whether a
// given call was the first), Phase 4's reward granting (section 17) must
// grant a Gym Leader's one-time money/XP reward exactly once even under a
// racing/retried duplicate victory request. A plain upsert can't tell a
// caller "was this a fresh row or did one already exist" — so this now
// attempts a bare `create` against the same @@unique constraint as before
// and treats a unique-constraint violation (a concurrent/retried call beat
// this one to it) as "already completed", not an error. The return value
// IS that exactly-once signal: true only for the call that actually
// created the row — gym-reward.service.ts must gate reward granting on it
// rather than on "victory happened" alone.
//
// Winning the Gym Leader battle (battleSlot === "leader") also awards the
// matching Gym Badge in the SAME call, atomically — a Badge exists to mark
// exactly that fact (see PlayerGymBadge's own doc comment,
// prisma/schema.prisma) — via the same upsert-with-empty-update idiom as
// before, since the Badge itself only needs idempotency, not a first-writer
// signal (a second racing call safely no-ops here regardless of what the
// completion-row race above decided).
export async function markGymBattleCompleted(
  tx: Prisma.TransactionClient,
  playerId: string,
  regionId: RegionId,
  gymNumber: 1 | 2 | 3,
  battleSlot: GymBattleSlotId
): Promise<boolean> {
  let firstCompletion = true;
  try {
    await tx.playerGymBattleProgress.create({ data: { playerId, regionId, gymNumber, battleSlot } });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    firstCompletion = false;
  }

  if (battleSlot === "leader") {
    await tx.playerGymBadge.upsert({
      where: { playerId_regionId_gymNumber: { playerId, regionId, gymNumber } },
      create: { playerId, regionId, gymNumber },
      update: {},
    });
  }

  return firstCompletion;
}

// Marks a region's Regional Champion battle as permanently won, and awards
// the matching Regional Medal in the same call. Returns the same
// exactly-once "was this the first call to actually complete it" signal as
// markGymBattleCompleted above, for the identical reason: Phase 4's
// Regional Champion reward (money/XP/Chests) must be gated on this, not on
// "victory happened".
export async function markRegionalChampionDefeated(
  tx: Prisma.TransactionClient,
  playerId: string,
  regionId: RegionId
): Promise<boolean> {
  let firstDefeat = true;
  try {
    await tx.playerRegionalChampionProgress.create({ data: { playerId, regionId } });
  } catch (error) {
    if (!isUniqueConstraintViolation(error)) throw error;
    firstDefeat = false;
  }

  await tx.playerRegionalMedal.upsert({
    where: { playerId_regionId: { playerId, regionId } },
    create: { playerId, regionId },
    update: {},
  });

  return firstDefeat;
}
