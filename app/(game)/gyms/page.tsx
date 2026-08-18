import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { GymsContent } from "@/features/gyms/components/GymsContent";
import { getPlayerGymJourney } from "@/features/gyms/services/gym-overview-view.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// GYMS & LEAGUES PHASE 4 — the generic Gym progression page (section 5):
// one route for every region's Gym journey, never 27 separate Gym pages.
// The real auth + onboarding guard lives in app/(game)/layout.tsx; the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type (getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip).
export default async function GymsPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const profile = await getPlayerProfile(session.user.id);
  const journey = await getPlayerGymJourney(profile.id);

  return (
    <GameScreen>
      <GymsContent journey={journey} />
    </GameScreen>
  );
}
