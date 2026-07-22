import { redirect } from "next/navigation";

import { OnboardingWelcome } from "@/features/onboarding/components/OnboardingWelcome";
import { StarterSelectionGrid } from "@/features/onboarding/components/StarterSelectionGrid";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getStarterSpecies } from "@/features/pokemon/services/species-catalog";
import { getCurrentSession } from "@/lib/auth/auth-session";

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect). A player who already completed onboarding is
// bounced to /map here — this is what guarantees this page can never be
// revisited after a starter has been chosen.
export default async function StarterSelectionPage() {
  const session = await getCurrentSession();

  if (!session) {
    redirect("/");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/map") {
    redirect("/map");
  }

  const user = session.user as { displayUsername?: string | null; username?: string | null; name: string };
  const displayName = user.displayUsername ?? user.username ?? user.name ?? "שחקן";

  return (
    <main dir="rtl" className="flex min-h-screen flex-col items-center justify-center gap-10 bg-slate-950 px-4 py-12">
      <OnboardingWelcome displayName={displayName} />
      <StarterSelectionGrid starters={getStarterSpecies()} />
    </main>
  );
}
