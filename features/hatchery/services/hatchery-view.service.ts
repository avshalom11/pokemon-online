import "server-only";

import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import { getIncubatorDefinition } from "@/features/eggs/data/incubator-definitions";
import { getOwnedEggById, listOwnedEggs } from "@/features/eggs/services/egg-ownership.service";
import { ensureStandardIncubator } from "@/features/eggs/services/incubator.service";
import { isIncubationReady, listActiveIncubations } from "@/features/eggs/services/incubation.service";
import type { EggAcquisitionSource } from "@/features/eggs/types/egg.types";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import type { PokemonRarity } from "@/shared/types/pokemon";
import { toRegionId } from "@/shared/types/region";
import { REGION_LABELS } from "@/shared/types/region-labels";

export interface HatcheryEggView {
  id: string;
  rarity: PokemonRarity;
  displayName: string;
  imageUrl: string;
  regionLabel: string;
  // Plain string (not narrowed to EggAcquisitionSource) — an egg dropped
  // before Phase 2's source column existed has `source: null`, same
  // "unknown -> render nothing" fallback every other optional display
  // field in this project already follows.
  source: EggAcquisitionSource | null;
}

export interface HatcheryActiveIncubationView {
  // The incubation's own primary key (PlayerEggIncubation.ownedEggId) —
  // what hatchIncubationAction/startIncubatingEgg's own callers pass.
  incubationId: string;
  battleProgress: number;
  requiredBattleTarget: number;
  isReady: boolean;
  egg: HatcheryEggView;
}

export interface HatcheryViewData {
  incubatorId: string;
  incubatorDisplayName: string;
  // null means the Standard Incubator is currently empty — never a second
  // boolean flag alongside this.
  activeIncubation: HatcheryActiveIncubationView | null;
  // Already excludes any egg with an active incubation (egg-ownership.
  // service.ts's own listOwnedEggs contract) — never re-filtered here.
  availableEggs: HatcheryEggView[];
}

function toEggView(egg: { id: string; rarity: string; regionId: string; source: string | null }): HatcheryEggView {
  const rarity = egg.rarity as PokemonRarity;
  const definition = getEggDefinition(rarity);

  return {
    id: egg.id,
    rarity,
    displayName: definition.displayName,
    imageUrl: definition.imageUrl,
    regionLabel: REGION_LABELS[toRegionId(egg.regionId)],
    source: egg.source as EggAcquisitionSource | null,
  };
}

// The Hatchery page's single aggregator (app/(game)/hatchery/page.tsx's
// only data call) — reads entirely through the existing EGGS PHASE 1-4
// services (ensureStandardIncubator, listOwnedEggs, listActiveIncubations,
// isIncubationReady), never a second incubator/egg mechanism and never a
// recomputed requiredBattleTarget (the persisted value is read as-is).
// ensureStandardIncubator is called unconditionally on every load — the
// same lazy "ensure on access" guarantee that already covers existing
// players from Phase 1, with no separate migration step.
export async function getHatcheryViewData(userId: string): Promise<HatcheryViewData> {
  const profile = await getPlayerProfile(userId);
  const incubator = await ensureStandardIncubator(profile.id);
  const incubatorDefinition = getIncubatorDefinition(incubator.incubatorTypeId);

  const [availableEggRows, activeIncubations] = await Promise.all([
    listOwnedEggs(profile.id),
    listActiveIncubations(profile.id),
  ]);

  // Today a player owns exactly one incubator (Phase 1), so at most one of
  // these can ever match — written as a find, not an index, so a future
  // multi-incubator player still resolves the RIGHT incubation for THIS
  // incubator rather than an arbitrary one.
  const activeIncubationRow = activeIncubations.find((incubation) => incubation.incubatorId === incubator.id) ?? null;

  let activeIncubation: HatcheryActiveIncubationView | null = null;
  if (activeIncubationRow) {
    const egg = await getOwnedEggById(activeIncubationRow.ownedEggId);
    if (egg) {
      activeIncubation = {
        incubationId: activeIncubationRow.ownedEggId,
        battleProgress: activeIncubationRow.battleProgress,
        requiredBattleTarget: activeIncubationRow.requiredBattleTarget,
        isReady: isIncubationReady(activeIncubationRow),
        egg: toEggView(egg),
      };
    }
  }

  return {
    incubatorId: incubator.id,
    incubatorDisplayName: incubatorDefinition.displayName,
    activeIncubation,
    availableEggs: availableEggRows.map(toEggView),
  };
}
