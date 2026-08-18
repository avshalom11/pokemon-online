import type { RegionId } from "@/shared/types/region";
import { REGION_GYM_SEQUENCE } from "./region-gym-sequence";

// GYM BADGES / MEDALS — SIMPLE NUMERIC IMAGE ARCHITECTURE. Mirrors
// gym-trainer-images.ts's own "one shared flat folder, numbered globally
// in REGION_GYM_SEQUENCE order" convention exactly — the SAME existing
// region-order source every other Gym unlock/lock-reason rule already
// reuses (region-gym-sequence.ts), never a second region-order table, and
// never 27/9 paths hardcoded individually in React. No artwork is
// generated here — SpriteImage's existing fallback covers a not-yet-added
// file (see GymVictoryRewardDialog's own doc comment).
const BADGE_IMAGE_ROOT = "/images/gyms/badges";
const MEDAL_IMAGE_ROOT = "/images/gyms/medals";
const GYMS_PER_REGION = 3;

function regionIndex(regionId: RegionId): number {
  const index = REGION_GYM_SEQUENCE.indexOf(regionId);
  if (index === -1) {
    throw new Error(`"${regionId}" is not part of the Gym region sequence`);
  }
  return index;
}

// Kanto Gym 1 -> 1.png ... Kanto Gym 3 -> 3.png, Johto Gym 1 -> 4.png, ...
// Paldea Gym 3 -> 27.png — regionIndex * 3 + gymNumber.
export function getGymBadgeImageUrl(regionId: RegionId, gymNumber: 1 | 2 | 3): string {
  const imageNumber = regionIndex(regionId) * GYMS_PER_REGION + gymNumber;
  return `${BADGE_IMAGE_ROOT}/${imageNumber}.png`;
}

// Kanto -> 1.png ... Paldea -> 9.png — regionIndex + 1.
export function getRegionalMedalImageUrl(regionId: RegionId): string {
  const imageNumber = regionIndex(regionId) + 1;
  return `${MEDAL_IMAGE_ROOT}/${imageNumber}.png`;
}
