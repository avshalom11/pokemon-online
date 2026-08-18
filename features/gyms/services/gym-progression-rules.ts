import type { GymBattleSlotId } from "../types/gym.types";

// GYMS & LEAGUES PHASE 1 — pure unlock/completion rules, deliberately
// decoupled from Prisma/the database: every function here takes an
// already-known completion snapshot and answers a yes/no question, so the
// unlock logic itself is fully unit-testable with zero DB setup. The
// DB-backed wrapper (gym-progression.service.ts) is the only thing that
// ever builds a real snapshot from PlayerGymBattleProgress/
// PlayerRegionalChampionProgress rows and calls into this module.

// A minimal snapshot of one player's progress in one region — everything
// these rules need to know, nothing more. `completedBattleSlots` keys are
// `${gymNumber}:${battleSlot}` (e.g. "1:leader"); a key's presence means
// that exact battle has been won.
export interface RegionGymProgressSnapshot {
  readonly completedBattleSlots: ReadonlySet<string>;
}

export function battleSlotKey(gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId): string {
  return `${gymNumber}:${battleSlot}`;
}

function isBattleSlotCompleted(snapshot: RegionGymProgressSnapshot, gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId): boolean {
  return snapshot.completedBattleSlots.has(battleSlotKey(gymNumber, battleSlot));
}

// A Gym is "fully completed" exactly when its Gym Leader battle has been
// won — Easy/Medium are prerequisites the sequential unlock rule below
// already guarantees were won first, so checking the leader slot alone is
// sufficient and avoids needing three separate checks.
function isGymFullyCompleted(snapshot: RegionGymProgressSnapshot, gymNumber: 1 | 2 | 3): boolean {
  return isBattleSlotCompleted(snapshot, gymNumber, "leader");
}

// Gym Order rules (section 4): Gym 1 is available immediately; Gym 2 is
// locked until Gym 1 is fully completed; Gym 3 is locked until Gym 2 is
// fully completed.
export function isGymUnlocked(snapshot: RegionGymProgressSnapshot, gymNumber: 1 | 2 | 3): boolean {
  if (gymNumber === 1) return true;
  return isGymFullyCompleted(snapshot, (gymNumber - 1) as 1 | 2 | 3);
}

// Within an unlocked Gym: Easy is always available; Medium is locked until
// Easy is completed; Leader is locked until Medium is completed. Gates on
// the Gym itself being unlocked first — a battle inside a locked Gym is
// never independently unlocked.
export function isGymBattleUnlocked(snapshot: RegionGymProgressSnapshot, gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId): boolean {
  if (!isGymUnlocked(snapshot, gymNumber)) return false;
  if (battleSlot === "easy") return true;
  if (battleSlot === "medium") return isBattleSlotCompleted(snapshot, gymNumber, "easy");
  return isBattleSlotCompleted(snapshot, gymNumber, "medium");
}

export function isGymBattleCompleted(snapshot: RegionGymProgressSnapshot, gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId): boolean {
  return isBattleSlotCompleted(snapshot, gymNumber, battleSlot);
}

// Regional Champion unlock rule (section 4): locked until all 3 Gym
// Badges in that region are earned — expressed here as "all 3 Gyms fully
// completed" (their Leader battle won), the same fact a badge marks, so
// this needs no separate badge-table dependency to evaluate.
export function isRegionalChampionUnlocked(snapshot: RegionGymProgressSnapshot): boolean {
  return isGymFullyCompleted(snapshot, 1) && isGymFullyCompleted(snapshot, 2) && isGymFullyCompleted(snapshot, 3);
}
