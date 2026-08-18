import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import type { PokemonType } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";
import { GYM_BATTLE_FORMATS } from "./gym-registry";
import type { GymBattleSlotId } from "../types/gym.types";
import type { RegionStatus } from "../services/gym-overview-view.service";

// Mirrors StartNpcBattleResult's own `status` union (gym-battle-session.
// service.ts) — repeated as a plain string-literal type rather than
// imported, since that file is "server-only" and this data module is
// imported by client components; keeping this a structural mirror (not a
// dependency) avoids pulling a server-only service into the client bundle.
type StartGymBattleStatus =
  | "started"
  | "resumed"
  | "in-progress-elsewhere"
  | "already-completed"
  | "locked"
  | "locked-level"
  | "locked-previous-region"
  | "invalid-target"
  | "no-usable-party";

// GYMS & LEAGUES PHASE 4 — the ONE place Hebrew display copy for Gym
// concepts lives, so the region-overview page, the individual-Gym section,
// the battle-screen context header, and every lock-reason message all pull
// from the exact same strings rather than each re-writing their own.

export const REGION_DISPLAY_NAMES_HE: Record<RegionId, string> = {
  kanto: "קאנטו",
  johto: "ג'וטו",
  hoenn: "הוען",
  sinnoh: "סינו",
  unova: "יונובה",
  kalos: "קאלוס",
  alola: "אלולה",
  galar: "גאלר",
  paldea: "פלדאה",
};

export const GYM_BATTLE_SLOT_LABELS_HE: Record<GymBattleSlotId, string> = {
  easy: "מתאמן קל",
  medium: "מתאמן בינוני",
  leader: "מנהיג המכון",
};

export function regionalChampionLabelHe(regionId: RegionId): string {
  return `מנהל מחוז ${REGION_DISPLAY_NAMES_HE[regionId]}`;
}

// The two Phase 4 region-level lock reasons, worded per this Phase's own
// examples (section 7) — never freely re-worded elsewhere; every caller
// that needs to show a lock reason imports this instead of writing its own
// string, so the wording can never drift between the region-overview page
// and any future screen that also needs it. `previousRegionId` is required
// for "locked-previous-region" (every region but Kanto reaching this reason
// always has one — see getPreviousRegionInGymSequence) and ignored for
// "locked-level".
export function regionGymLockMessageHe(reason: "locked-level" | "locked-previous-region", regionId: RegionId, previousRegionId?: RegionId | null): string {
  if (reason === "locked-level") {
    return "מערכת המכונים נפתחת ברמה 10";
  }
  const previousName = previousRegionId ? REGION_DISPLAY_NAMES_HE[previousRegionId] : "";
  return `יש להשלים את מנהל מחוז ${previousName} כדי לפתוח את מכוני ${REGION_DISPLAY_NAMES_HE[regionId]}`;
}

// GYMS & LEAGUES PHASE 9 (section 6) — Gym type presentation reuses the
// project's own existing type-label table (shared/types/pokemon-labels.ts)
// rather than a second Hebrew type dictionary.
export function gymTypeLabelHe(type: PokemonType): string {
  return POKEMON_TYPE_LABELS[type];
}

// GYMS & LEAGUES PHASE 9 (section 8) — one consolidated region-status label,
// reusing the exact same lock-reason wording regionGymLockMessageHe already
// established for "locked-level"/"locked-previous-region".
export function regionStatusLabelHe(status: RegionStatus): string {
  switch (status) {
    case "locked-level":
      return "נעול — נדרשת רמה 10";
    case "locked-previous-region":
      return "נעול";
    case "available":
      return "זמין";
    case "in-progress":
      return "בתהליך";
    case "completed":
      return "הושלם";
  }
}

// GYMS & LEAGUES PHASE 9 (section 6) — the approved battle-format numbers
// (gym-registry.ts's own GYM_BATTLE_FORMATS) presented as "Easy 3v3" /
// "Medium 4v4" / "Leader 6v6" style Hebrew copy — read from that SAME table,
// never a second hardcoded copy of the party-size numbers.
export function gymBattleFormatLabelHe(battleSlot: GymBattleSlotId): string {
  const format = GYM_BATTLE_FORMATS[battleSlot];
  return `${format.maxPlayerPokemon} נגד ${format.npcPokemonCount}`;
}

// GYMS & LEAGUES PHASE 9 (section 9) — the one place the
// "Start Battle"/"Continue Battle" button copy is chosen, so every caller
// (Gym battle row, Regional Champion row) picks the same wording for the
// same hasActiveSession flag rather than re-deciding it inline.
export function gymBattleActionLabelHe(hasActiveSession: boolean): string {
  return hasActiveSession ? "המשך קרב" : "התחל קרב";
}

// Every non-success startNpcBattle status, worded for a toast/inline error
// under the "התחל קרב" button — "started"/"resumed" are handled by the
// caller (a redirect to /gyms/battle), never shown as text.
export function gymStartResultMessageHe(status: StartGymBattleStatus): string {
  switch (status) {
    case "locked-level":
      return "מערכת המכונים נפתחת ברמה 10";
    case "locked-previous-region":
      return "יש להשלים קודם את מנהל המחוז הקודם";
    case "locked":
      return "קרב זה עדיין נעול";
    case "already-completed":
      return "קרב זה כבר הושלם";
    case "in-progress-elsewhere":
      return "יש קרב פעיל אחר — יש לסיים אותו קודם";
    case "no-usable-party":
      return "אין פוקימונים זמינים בקבוצה";
    case "invalid-target":
      return "קרב לא תקין";
    default:
      return "לא ניתן להתחיל את הקרב";
  }
}
