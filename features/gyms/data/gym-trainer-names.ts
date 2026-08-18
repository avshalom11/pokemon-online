import type { RegionId } from "@/shared/types/region";
import type { GymBattleSlotId } from "../types/gym.types";

// GYM BATTLES — FIXED TRAINER NAMES (later task, section 2). 90 original,
// fixed display names — 27 Easy + 27 Medium + 27 Gym Leader + 9 Regional
// Champion — none of them a canonical Pokémon Gym Leader or any other
// copyrighted character name. Stored as data (never invented inline in
// React), one accessor per concept, same "one deterministic lookup, no
// duplicated table" convention gym-badges.ts/regional-medals.ts already
// established. Indexed by (regionId, gymNumber, battleSlot) for a Gym
// trainer, (regionId) alone for a Regional Champion.

interface RegionTrainerNames {
  // Index 0/1/2 = Gym 1/2/3's own trainer for that battle slot.
  readonly easy: readonly [string, string, string];
  readonly medium: readonly [string, string, string];
  readonly leader: readonly [string, string, string];
  readonly champion: string;
}

// GENDER DESIGN (later task, section 2/3) — each Gym's THREE trainers
// (Easy/Medium/Leader) share that Gym's own approved gender; the Regional
// Champion has its own, separately-approved gender. Leader/Champion names
// below are the exact approved "strong names" table; Easy/Medium names are
// ordinary Hebrew given names (preserving this data's original style/
// architecture — three separately-named opponents per Gym, never
// collapsed into one), chosen to be unmistakably the same gender as their
// Gym and never reused anywhere else across all 90 names.
const TRAINER_NAMES: Record<RegionId, RegionTrainerNames> = {
  // kanto: Gym1 male, Gym2 male, Gym3 female, Champion male.
  kanto: { easy: ["אורי", "דור", "מיכל"], medium: ["תומר", "זיו", "שירה"], leader: ["רייבן", "קיידן", "אלירה"], champion: "דרייק" },
  // johto: Gym1 female, Gym2 male, Gym3 female, Champion male.
  johto: { easy: ["קרן", "נדב", "הילה"], medium: ["רותי", "רן", "פזית"], leader: ["סלינה", "רונאן", "ניירה"], champion: "קורווין" },
  // hoenn: Gym1 male, Gym2 female, Gym3 male, Champion female.
  hoenn: { easy: ["אלמוג", "יערה", "נחשון"], medium: ["ברק", "סיוון", "עידו"], leader: ["אסלן", "קאסיה", "דארן"], champion: "ואלירה" },
  // sinnoh: Gym1 female, Gym2 male, Gym3 male, Champion male.
  sinnoh: { easy: ["יעל", "שי", "איתי"], medium: ["נטע", "גיל", "בן"], leader: ["ליירה", "קיירו", "דרייבן"], champion: "אוריון" },
  // unova: Gym1 male, Gym2 female, Gym3 male, Champion female.
  unova: { easy: ["אלעד", "מור", "רואי"], medium: ["עוז", "מיה", "אבנר"], leader: ["קאיין", "סרפינה", "לוקאן"], champion: "מורגנה" },
  // kalos: Gym1 female, Gym2 male, Gym3 female, Champion male.
  kalos: { easy: ["אורית", "שגיא", "יפית"], medium: ["ורד", "עידן", "קטיה"], leader: ["אוולין", "אלריק", "סילביה"], champion: "לאוניס" },
  // alola: Gym1 male, Gym2 female, Gym3 male, Champion male.
  alola: { easy: ["יאיר", "רוני", "גיא"], medium: ["עמרי", "שני", "יובל"], leader: ["קאי", "מאיה", "טארק"], champion: "ראידן" },
  // galar: Gym1 male, Gym2 female, Gym3 female, Champion male.
  galar: { easy: ["אורן", "גיתית", "נועה"], medium: ["רועי", "אביגיל", "הדר"], leader: ["רואן", "אליסיה", "ויולה"], champion: "גאריק" },
  // paldea: Gym1 male, Gym2 male, Gym3 female, Champion male.
  paldea: { easy: ["אסף", "אלון", "ליה"], medium: ["עמית", "רון", "מירב"], leader: ["דמיאן", "ליאון", "אריה"], champion: "ואלטר" },
};

export function getGymTrainerName(regionId: RegionId, gymNumber: 1 | 2 | 3, battleSlot: GymBattleSlotId): string {
  return TRAINER_NAMES[regionId][battleSlot][gymNumber - 1];
}

export function getRegionalChampionTrainerName(regionId: RegionId): string {
  return TRAINER_NAMES[regionId].champion;
}
