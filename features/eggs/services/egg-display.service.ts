import { getEggDefinition } from "@/features/eggs/data/egg-definitions";
import type { EggAcquisitionSource } from "@/features/eggs/types/egg.types";
import type { PokemonRarity } from "@/shared/types/pokemon";
import { toRegionId } from "@/shared/types/region";
import { REGION_LABELS } from "@/shared/types/region-labels";

export interface OwnedEggView {
  id: string;
  rarity: PokemonRarity;
  displayName: string;
  imageUrl: string;
  regionLabel: string;
  source: EggAcquisitionSource | null;
}

// EGGS PHASE 6 — a shared "raw PlayerOwnedEgg row -> display view" mapping
// for any read-only surface that shows an owned egg (today: /inventory's
// own egg section). Never re-types an egg's own displayName/imageUrl —
// always through getEggDefinition (Phase 1) — and never re-derives its
// region label — always through REGION_LABELS, the same map the rest of
// the app already uses. Pure and framework-free (no "server-only"): safe
// to call from either a server-only view service or, if a future surface
// needs it, directly.
export function toOwnedEggView(egg: { id: string; rarity: string; regionId: string; source: string | null }): OwnedEggView {
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
