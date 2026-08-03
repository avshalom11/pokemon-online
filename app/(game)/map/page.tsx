import { redirect } from "next/navigation";

import { MapContent } from "./components/MapContent";
import { getRegionDefinition } from "@/features/regions/data/region-registry";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";
import { toRegionId } from "@/shared/types/region";

// The real auth + onboarding guard now lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip. The player's active region (Region
// Registry) decides what MapContent renders: Kanto's real map/zone
// behavior, unchanged, or a region-specific placeholder for every other
// region — see MapContent's own doc comment.
export default async function MapPage({ searchParams }: { searchParams: Promise<{ notice?: string }> }) {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const { notice } = await searchParams;

  const profile = await getPlayerProfile(session.user.id);
  const region = getRegionDefinition(toRegionId(profile.regionId));

  return <MapContent notice={notice} region={region} />;
}
