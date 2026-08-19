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
//
// REGIONAL MEDAL IMAGE PATH — FOCUSED FIX (later task) — Badges AND Medals
// are actually a single, shared flat folder on disk (public/images/gyms/
// badges/), 4 numbered slots per region — the 3 Gym Badges followed by that
// region's own Regional Medal — never a separate badges/medals split. There
// is deliberately no MEDAL_IMAGE_ROOT constant any more.
const BADGE_IMAGE_ROOT = "/images/gyms/badges";
const GYMS_PER_REGION = 3;
const SLOTS_PER_REGION = GYMS_PER_REGION + 1;

function regionIndex(regionId: RegionId): number {
  const index = REGION_GYM_SEQUENCE.indexOf(regionId);
  if (index === -1) {
    throw new Error(`"${regionId}" is not part of the Gym region sequence`);
  }
  return index;
}

// GYM BADGE/MEDAL IMAGE ORDER — FULL CONSISTENCY FIX (later task) — the
// stale 3-slots-per-region formula (regionIndex * 3 + gymNumber) put every
// region's own Badges immediately after the PREVIOUS region's Medal
// instead of after its own — e.g. Johto Gym 1 used to resolve to 4.png,
// which is actually Kanto's Medal slot, not Johto's own Gym 1 (the reported
// bug: a Medal image showing where a Badge should). Badges now share the
// SAME 4-slot-per-region block Medals already use below (SLOTS_PER_REGION,
// not GYMS_PER_REGION) — the two are one single numbering system, never two
// that can drift apart again.
//
// Kanto Gym 1 -> 1.png ... Kanto Gym 3 -> 3.png, Johto Gym 1 -> 5.png, ...
// Paldea Gym 3 -> 35.png — regionIndex * 4 + gymNumber.
export function getGymBadgeImageUrl(regionId: RegionId, gymNumber: 1 | 2 | 3): string {
  const imageNumber = regionIndex(regionId) * SLOTS_PER_REGION + gymNumber;
  return `${BADGE_IMAGE_ROOT}/${imageNumber}.png`;
}

// Kanto -> 4.png, Johto -> 8.png, ... Paldea -> 36.png —
// regionIndex * SLOTS_PER_REGION + SLOTS_PER_REGION (the 4th slot in that
// region's own 4-slot block, same shared badges/ folder the 3 Gym Badges
// above already read).
export function getRegionalMedalImageUrl(regionId: RegionId): string {
  const imageNumber = regionIndex(regionId) * SLOTS_PER_REGION + SLOTS_PER_REGION;
  return `${BADGE_IMAGE_ROOT}/${imageNumber}.png`;
}
