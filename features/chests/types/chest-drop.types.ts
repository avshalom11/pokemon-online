import type { ChestTypeId } from "@/features/chests/data/chest-definitions";

// CHESTS PHASE 5 — the battle-response shape for "did this victory drop a
// chest" — deliberately the same shape convention EggDropOutcome
// (features/eggs/types/egg.types.ts) already establishes for its own,
// entirely independent battle-drop system: minimal/generic (no visual
// notification data), rides along inside BattleVictoryReward
// (features/battle-session/services/battle-session.service.ts) as a
// sibling field to `egg`, never replacing or gating it — one victory can
// award an egg, a chest, both, or neither, all independently.
export type ChestDropOutcome =
  | { dropped: false }
  | { dropped: true; chestTypeId: ChestTypeId; displayName: string; imageUrl: string };
