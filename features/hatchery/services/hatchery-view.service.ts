import "server-only";

import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import { getIncubatorDefinition, type IncubatorTypeId } from "@/features/eggs/data/incubator-definitions";
import { getOwnedEggById, listOwnedEggs } from "@/features/eggs/services/egg-ownership.service";
import { ensureStarterIncubator, isIncubatorPermanent, listPlayerIncubators } from "@/features/eggs/services/incubator.service";
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
  // INCUBATOR SPEED MODEL — read straight off the persisted row, no
  // conversion: every eligible victory adds a flat +1, and
  // requiredBattleTarget is already Math.ceil'd to a whole battle count at
  // incubation-start time (incubation.service.ts's startIncubatingEgg), so
  // both numbers are already in the exact "battles" units the Hatchery UI
  // has always shown.
  battleProgress: number;
  requiredBattleTarget: number;
  isReady: boolean;
  egg: HatcheryEggView;
}

export interface HatcheryIncubatorView {
  // The owned incubator instance's own id (PlayerIncubator.id) — what
  // startIncubationAction's own incubatorId parameter expects.
  id: string;
  incubatorTypeId: IncubatorTypeId;
  displayName: string;
  imageUrl: string;
  speedMultiplier: number;
  // True only for the player's one permanent starter Regular Incubator —
  // see incubator.service.ts's isIncubatorPermanent. Every other instance
  // (bought in the Shop, or a future chest reward) is single-use.
  isPermanent: boolean;
  // null means this specific incubator instance is currently empty — never
  // a second boolean flag alongside this.
  activeIncubation: HatcheryActiveIncubationView | null;
}

export interface HatcheryViewData {
  // INCUBATOR EXPANSION — every incubator instance the player owns, the
  // permanent starter included, each with its own independent
  // empty/incubating/ready state. A player may have several active
  // incubations at once (one per non-empty incubator) — never assumed to
  // be at most one, unlike Phase 1's single-incubator design.
  incubators: HatcheryIncubatorView[];
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
// only data call) — reads entirely through the existing eggs/incubator
// services, never a second incubator/egg mechanism. ensureStarterIncubator
// is called unconditionally on every load — the same lazy "ensure on
// access" guarantee that has covered existing players since Phase 1, with
// no separate migration step.
export async function getHatcheryViewData(userId: string): Promise<HatcheryViewData> {
  const profile = await getPlayerProfile(userId);
  await ensureStarterIncubator(profile.id);

  const [incubatorRows, availableEggRows, activeIncubations] = await Promise.all([
    listPlayerIncubators(profile.id),
    listOwnedEggs(profile.id),
    listActiveIncubations(profile.id),
  ]);

  const activeIncubationByIncubatorId = new Map(activeIncubations.map((incubation) => [incubation.incubatorId, incubation]));

  // Permanent starter first, then every consumable instance in the order
  // it was acquired — a stable, predictable ordering rather than one that
  // could reshuffle across loads.
  const orderedIncubatorRows = [...incubatorRows].sort((a, b) => {
    if (isIncubatorPermanent(a) !== isIncubatorPermanent(b)) return isIncubatorPermanent(a) ? -1 : 1;
    return a.createdAt.getTime() - b.createdAt.getTime();
  });

  const incubators: HatcheryIncubatorView[] = [];
  for (const row of orderedIncubatorRows) {
    const definition = getIncubatorDefinition(row.incubatorTypeId);
    const activeRow = activeIncubationByIncubatorId.get(row.id);

    let activeIncubation: HatcheryActiveIncubationView | null = null;
    if (activeRow) {
      const egg = await getOwnedEggById(activeRow.ownedEggId);
      if (egg) {
        activeIncubation = {
          incubationId: activeRow.ownedEggId,
          battleProgress: activeRow.battleProgress,
          requiredBattleTarget: activeRow.requiredBattleTarget,
          isReady: isIncubationReady(activeRow),
          egg: toEggView(egg),
        };
      }
    }

    incubators.push({
      id: row.id,
      incubatorTypeId: definition.id,
      displayName: definition.displayName,
      imageUrl: definition.imageUrl,
      speedMultiplier: definition.speedMultiplier,
      isPermanent: isIncubatorPermanent(row),
      activeIncubation,
    });
  }

  return {
    incubators,
    availableEggs: availableEggRows.map(toEggView),
  };
}
