import { redirect } from "next/navigation";

import { MapContent } from "./components/MapContent";
import { GameHeader } from "@/components/layout/GameHeader";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getCurrentSession } from "@/lib/auth/auth-session";

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect — this is the actual guard). MapContent itself
// is the original map page's content, moved here unchanged. A player who
// hasn't finished onboarding yet is redirected to the starter page instead.
export default async function MapPage() {
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
      <MapContent />
    </>
  );
}
