import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { HomeContent } from "@/features/home/components/HomeContent";
import { getHomeViewData } from "@/features/home/services/home-data.service";
import { getCurrentSession } from "@/lib/auth/auth-session";

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

  return (
    <GameScreen>
      <HomeContent data={data} username={session.user.username ?? null} />
    </GameScreen>
  );
}
