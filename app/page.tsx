import { redirect } from "next/navigation";

import { AuthScreen } from "@/components/auth/AuthScreen";
import { getOnboardingRedirectTarget } from "@/features/onboarding/services/onboarding-status";
import { getCurrentSession } from "@/lib/auth/auth-session";

// The game's entry point. Real, server-side authorization check (proxy.ts
// only does an optimistic cookie-presence redirect — this is the actual
// guard): an authenticated visitor never sees the login/registration screen,
// and lands on the starter page or the home hub depending on onboarding status.
export default async function HomePage() {
  const session = await getCurrentSession();

  if (session) {
    redirect(await getOnboardingRedirectTarget(session.user.id));
  }

  return <AuthScreen />;
}
