import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { HomeContent } from "@/features/home/components/HomeContent";
import { getHomeViewData } from "@/features/home/services/home-data.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// The real auth + onboarding guard now lives in app/(game)/layout.tsx (this
// page is only ever reached once that guard has already passed) — the
// no-session check below exists purely so TypeScript can narrow
// session.user.id's type; getCurrentSession is cache()-wrapped, so this
// costs no extra DB round trip. This is the default landing hub after
// login/onboarding; /map remains reachable from here.
export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const data = await getHomeViewData(session.user.id);
  // GLOBAL CHAT — HOME EMBED. getPlayerProfile is cache()-wrapped (lib/auth/
  // player-profile.ts) and already called upstream (app/(game)/layout.tsx,
  // getHomeViewData itself), so this costs no extra DB round trip — kept as
  // its own call rather than added to HomeViewData, matching that type's
  // own doc comment: profile-level display fields deliberately don't live
  // there.
  const profile = await getPlayerProfile(session.user.id);

  return (
    <GameScreen>
      <HomeContent data={data} username={session.user.username ?? null} currentPlayerDisplayName={profile.displayName} />
    </GameScreen>
  );
}
