import type { RegionId } from "@/shared/types/region";
import { REGION_GYM_SEQUENCE } from "./region-gym-sequence";

// GYMS — SIMPLE CHARACTER IMAGE ARCHITECTURE. One representative character
// image per Gym (shared across its Easy/Medium/Leader battles — this is
// presentation only, those three battles stay entirely separate) and one
// per Regional Champion. 9 regions x 4 images (3 Gyms + 1 Champion) = 36
// images total, numbered globally in REGION_GYM_SEQUENCE order — the exact
// same existing region-order source every other Gym unlock/lock-reason rule
// already reuses (region-gym-sequence.ts), never a second region-order
// table. No artwork is generated here — SpriteImage's existing fallback
// covers a not-yet-added file.
const TRAINER_IMAGE_ROOT = "/images/gyms/trainers";
const IMAGES_PER_REGION = 4;

function regionIndex(regionId: RegionId): number {
  const index = REGION_GYM_SEQUENCE.indexOf(regionId);
  if (index === -1) {
    throw new Error(`"${regionId}" is not part of the Gym region sequence`);
  }
  return index;
}

// Kanto Gym 1 -> 1.png, Kanto Gym 3 -> 3.png, Johto Gym 1 -> 5.png, etc. —
// regionIndex * 4 + gymNumber.
export function getGymCharacterImageUrl(regionId: RegionId, gymNumber: 1 | 2 | 3): string {
  const imageNumber = regionIndex(regionId) * IMAGES_PER_REGION + gymNumber;
  return `${TRAINER_IMAGE_ROOT}/${imageNumber}.png`;
}

// Kanto Champion -> 4.png, Paldea Champion -> 36.png — regionIndex * 4 + 4
// (the 4th slot within that region's own 4-image block).
export function getRegionalChampionCharacterImageUrl(regionId: RegionId): string {
  const imageNumber = regionIndex(regionId) * IMAGES_PER_REGION + IMAGES_PER_REGION;
  return `${TRAINER_IMAGE_ROOT}/${imageNumber}.png`;
}
