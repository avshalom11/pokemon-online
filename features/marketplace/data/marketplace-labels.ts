import { MIN_MARKETPLACE_PLAYER_LEVEL } from "@/features/marketplace/config/marketplace-access-rules.config";

// PLAYER LEVEL ACCESS REQUIREMENTS — the ONE place the Marketplace's
// locked-below-level Hebrew copy lives, reused by every mutating action's
// error-message mapping AND the page's own locked banner, so the wording
// can never drift between them AND always reflects the real threshold
// (interpolated from MIN_MARKETPLACE_PLAYER_LEVEL, never a second hardcoded
// "5" — the exact drift gym-labels.ts's own hardcoded "10" strings fell
// into for Gyms, deliberately avoided here).
export const MARKETPLACE_LOCKED_MESSAGE_HE = `השוק זמין החל מרמה ${MIN_MARKETPLACE_PLAYER_LEVEL}.`;
