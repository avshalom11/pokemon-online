import { redirect } from "next/navigation";

import { OnboardingWelcome } from "@/features/onboarding/components/OnboardingWelcome";
import { StarterSelectionGrid } from "@/features/onboarding/components/StarterSelectionGrid";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getStarterSpecies } from "@/features/pokemon/services/species-catalog";
import { getCurrentSession } from "@/lib/auth/auth-session";

// Real, server-side authorization check (proxy.ts only does an optimistic
// cookie-presence redirect). A player who already completed onboarding is
// bounced to /home here — this is what guarantees this page can never be
// revisited after a starter has been chosen.
export default async function StarterSelectionPage() {
  const session = await getCurrentSession();

  // STALE SESSION COOKIE — same reasoning as app/(game)/layout.tsx's own
  // identical guard: proxy.ts already confirmed a session_token cookie is
  // present for this PROTECTED_PATHS route, so getCurrentSession() finding
  // no session here means the cookie is stale, not merely absent.
  // redirect("/") would loop forever against proxy.ts's optimistic
  // cookie-presence redirect — see app/api/clear-stale-session/route.ts.
  if (!session) {
    redirect("/api/clear-stale-session");
  }

  const redirectTarget = await getOnboardingRedirectTarget(session.user.id);

  if (redirectTarget === "/home") {
    redirect("/home");
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
