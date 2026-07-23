import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { HomeContent } from "@/features/home/components/HomeContent";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { getHomeViewData } from "@/features/home/services/home-data.service";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getCurrentSession } from "@/lib/auth/auth-session";

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect — this is the actual guard), same pattern as
// app/map/page.tsx and app/battle/page.tsx. This is now the default landing
// hub after login/onboarding; /map remains reachable from here.
export default async function HomePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/onboarding/starter") {
    redirect("/onboarding/starter");
  }

  const data = await getHomeViewData(session.user.id);

  return (
    <>
      <HomeHeader player={data} />
      <GameScreen>
        <HomeContent data={data} />
      </GameScreen>
    </>
  );
}
