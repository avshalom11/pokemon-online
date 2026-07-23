import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { MyPokemonContent } from "@/features/pokemon/components/MyPokemonContent";
import { getMyPokemonViewData } from "@/features/pokemon/services/my-pokemon-view.service";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getCurrentSession } from "@/lib/auth/auth-session";

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect — this is the actual guard), same pattern as
// app/home/page.tsx. HomeHeader is reused as-is (same player-resource shape
// getMyPokemonViewData returns) so this page shares Home's chrome without
// any changes to HomeHeader itself.
export default async function MyPokemonPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/onboarding/starter") {
    redirect("/onboarding/starter");
  }

  const data = await getMyPokemonViewData(session.user.id);

  return (
    <>
      <HomeHeader player={data} />
      <GameScreen>
        <MyPokemonContent data={data} />
      </GameScreen>
    </>
  );
}
