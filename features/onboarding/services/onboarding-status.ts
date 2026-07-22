import "server-only";

import { getPlayerProfile } from "@/lib/auth/player-profile";

export type OnboardingRedirectTarget = "/onboarding/starter" | "/map";

// Single source of truth for "where should an authenticated user land",
// kept in the onboarding feature (not lib/auth/) so auth stays ignorant of
// onboarding's business rule. Called from app/page.tsx, app/map/page.tsx,
// app/battle/page.tsx and app/onboarding/starter/page.tsx so all four agree.
export async function getOnboardingRedirectTarget(userId: string): Promise<OnboardingRedirectTarget> {
  const profile = await getPlayerProfile(userId);

  return profile.onboardingCompleted ? "/map" : "/onboarding/starter";
}
