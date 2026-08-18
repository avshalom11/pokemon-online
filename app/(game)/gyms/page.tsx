import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { GymsContent } from "@/features/gyms/components/GymsContent";
import { getPlayerCurrentRegionGymOverview } from "@/features/gyms/services/gym-overview-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// GYMS & LEAGUES PHASE 4, REGION-SCOPED UI (later task) — the generic Gym
// progression page (section 5): one route, scoped to the player's own
// CURRENT active region only (PlayerProfile.regionId, resolved server-side
// inside getPlayerCurrentRegionGymOverview — never a client-supplied
// region) rather than the full 9-region journey. The real auth +
// onboarding guard lives in app/(game)/layout.tsx; the no-session check
// below exists purely so TypeScript can narrow session.user.id's type
// (getCurrentSession is cache()-wrapped, so this costs no extra DB round
// trip).
export default async function GymsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);
  const region = await getPlayerCurrentRegionGymOverview(profile.id);

  return (
    <GameScreen>
      <GymsContent region={region} />
    </GameScreen>
  );
}
