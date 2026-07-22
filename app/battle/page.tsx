import { redirect } from "next/navigation";
import { Suspense } from "react";

import { BattleContent } from "./components/BattleContent";
import { GameHeader } from "@/components/layout/GameHeader";
import { GameScreen } from "@/components/layout/GameScreen";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getCurrentSession } from "@/lib/auth/auth-session";

function BattleLoadingFallback() {
  return (
    <GameScreen>
      <main className="flex h-full items-center justify-center bg-slate-900 text-slate-300">
        <p>טוען קרב...</p>
      </main>
    </GameScreen>
  );
}

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect — this is the actual guard). BattleContent and
// the battle engine/encounter system below it are untouched. A player who
// hasn't finished onboarding yet is redirected to the starter page instead.
export default async function BattlePage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/onboarding/starter") {
    redirect("/onboarding/starter");
  }

  return (
    <>
      <GameHeader />
      <Suspense fallback={<BattleLoadingFallback />}>
        <BattleContent />
      </Suspense>
    </>
  );
}
