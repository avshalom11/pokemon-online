import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { getRegionTravelCost } from "@/features/regions/config/region-travel-cost.config";
import { WorldContent, type WorldRegionView } from "@/features/regions/components/WorldContent";
import { REGION_REGISTRY } from "@/features/regions/data/region-registry";
import { getActiveRegionId } from "@/features/regions/services/region.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { REGION_LABELS } from "@/shared/types/region-labels";
import type { RegionId } from "@/shared/types/region";

// "מחוז X" -> "X" — the bare region name for a compact card title (the
// dialog/header elsewhere in this feature use REGION_LABELS's own "מחוז "
// prefix in full-sentence text; a repeated "מחוז" on every one of 9 grid
// tiles would just be visual noise). Never a second, independently-typed
// Hebrew name list — this only ever strips the one known prefix off the
// SAME shared REGION_LABELS every other Hebrew region name in this
// codebase already reads from.
function bareRegionName(regionId: RegionId): string {
  return REGION_LABELS[regionId].replace(/^מחוז /, "");
}

// The real auth + onboarding guard lives in app/(game)/layout.tsx (this page
// is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip. All 9 regions are shown and selectable from
// the start — there is no locked-region state in this phase.
export default async function WorldPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const activeRegionId = await getActiveRegionId(session.user.id);
  const regions: WorldRegionView[] = REGION_REGISTRY.map(({ id, cardImageSrc }) => ({
    id,
    hebrewName: bareRegionName(id),
    travelCost: getRegionTravelCost(id),
    cardImageSrc,
  }));

  return (
    <GameScreen>
      <WorldContent regions={regions} activeRegionId={activeRegionId} />
    </GameScreen>
  );
}
