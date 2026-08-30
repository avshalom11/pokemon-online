import "server-only";

import { getPlayerLevel } from "@/features/player-progression/progression-service";
import { MIN_MARKETPLACE_PLAYER_LEVEL } from "@/features/marketplace/config/marketplace-access-rules.config";

// PLAYER LEVEL ACCESS REQUIREMENTS — the ONE shared authoritative check
// every Marketplace entry point calls (the page's own view gate and every
// mutating service below) rather than each re-deriving its own
// `level >= 5` inline. Reuses the project's own progression system
// (getPlayerLevel reads PlayerProfile.level directly) — never a second,
// independent level-tracking mechanism.
export async function isMarketplaceUnlockedForPlayer(playerId: string): Promise<boolean> {
  const level = await getPlayerLevel(playerId);
  return level >= MIN_MARKETPLACE_PLAYER_LEVEL;
}
