import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { WorldContent, type WorldRegionView } from "@/features/regions/components/WorldContent";
import { REGION_REGISTRY } from "@/features/regions/data/region-registry";
import { getActiveRegionId } from "@/features/regions/services/region.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

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
  const regions: WorldRegionView[] = REGION_REGISTRY.map(({ id, englishName, cardImageSrc }) => ({
    id,
    englishName,
    cardImageSrc,
  }));

  return (
    <GameScreen>
      <WorldContent regions={regions} activeRegionId={activeRegionId} />
    </GameScreen>
  );
}
