import { redirect } from "next/navigation";

import { GameScreen } from "@/components/layout/GameScreen";
import { HomeHeader } from "@/features/home/components/HomeHeader";
import { PokemonCenterContent } from "@/features/pokemon-center/components/PokemonCenterContent";
import { getPokemonCenterViewData } from "@/features/pokemon-center/services/pokemon-center-view.service";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getCurrentSession } from "@/lib/auth/auth-session";

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect — this is the actual guard), same pattern as
// app/home/page.tsx and app/my-pokemon/page.tsx. HomeHeader is reused as-is
// since getPokemonCenterViewData returns the same player-resource shape.
export default async function PokemonCenterPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/onboarding/starter") {
    redirect("/onboarding/starter");
  }

  const data = await getPokemonCenterViewData(session.user.id);

  return (
    <>
      <HomeHeader player={data} />
      <GameScreen>
        <PokemonCenterContent initialParty={data.party} />
      </GameScreen>
    </>
  );
}
