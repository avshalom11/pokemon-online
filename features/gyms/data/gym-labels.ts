import { POKEMON_TYPE_LABELS } from "@/shared/types/pokemon-labels";
import { MAJOR_STATUS_LABELS } from "@/features/battle/status/major-status-labels";
import type { PokemonType } from "@/shared/types/pokemon";
import type { RegionId } from "@/shared/types/region";
import type { ShopItem } from "@/features/shop/types/shop.types";
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
  | "no-usable-party"
  | "invalid-selection";

// GYMS & LEAGUES PHASE 4 — the ONE place Hebrew display copy for Gym
// concepts lives, so the region-overview page, the individual-Gym section,
// the battle-screen context header, and every lock-reason message all pull
// from the exact same strings rather than each re-writing their own.

export const REGION_DISPLAY_NAMES_HE: Record<RegionId, string> = {
  kanto: "קאנטו",
  johto: "ג'וטו",
  hoenn: "הואן",
  sinnoh: "סינו",
  unova: "יונובה",
  kalos: "קאלוס",
  alola: "אלולה",
  galar: "גאלר",
  paldea: "פלדאה",
};

// GYM BATTLE COPY + ITEM EFFECT DISPLAY (later task) — the approved
// role labels, replacing the earlier "מתאמן קל"/"מתאמן בינוני"/"מנהיג
// המכון" wording. Display text only — GymBattleSlotId itself
// ("easy"/"medium"/"leader") is untouched, so nothing that branches on the
// internal id (unlock rules, battle format, reward gating) is affected.
export const GYM_BATTLE_SLOT_LABELS_HE: Record<GymBattleSlotId, string> = {
  easy: "חניך מתחיל",
  medium: "חניך מתקדם",
  leader: "מאמן המכון",
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

// Mirrors UseGymBattleItemResult's own non-success `status` union
// (gym-battle-item.service.ts) — same structural-mirror-not-dependency
// reasoning as StartGymBattleStatus above (server-only file, client-imported
// label module).
type GymBagItemErrorStatus =
  | "invalid-item"
  | "not-participant"
  | "not-owned"
  | "no-item"
  | "invalid-target"
  | "forced-replacement-pending"
  | "stale-action";

// BAG DURING GYM BATTLE (later task, section 4) — every non-success
// useGymBattleItem status, worded for the Bag panel's own inline error.
export function gymBagItemErrorMessageHe(status: GymBagItemErrorStatus): string {
  switch (status) {
    case "invalid-item":
      return "לא ניתן להשתמש בפריט זה בקרב";
    case "not-participant":
      return "הפוקימון אינו משתתף בקרב הזה";
    case "not-owned":
      return "הפוקימון אינו שייך לך";
    case "no-item":
      return "אין לך יותר פריטים אלו";
    case "invalid-target":
      return "לא ניתן להשתמש בפריט על פוקימון זה";
    case "forced-replacement-pending":
      return "יש להחליף פוקימון לפני שימוש בתיק";
    case "stale-action":
      return "הפעולה לא בוצעה — נסה שוב";
  }
}

// GYM BATTLE COPY + ITEM EFFECT DISPLAY (later task, section 4) — the
// Bag panel's own "what does this item actually do" label, derived
// EXCLUSIVELY from the item's own real catalog fields
// (medicineEffectKind/healPercent/curesStatus — features/shop/data/
// shop-items.ts, the SAME single source of truth use-medicine.service.ts/
// gym-battle-item.service.ts actually apply the effect from) — never a
// hardcoded percentage table here. heal/revive are percent-of-max-HP-based
// (healPercent, a 0..1 fraction); cure-status items instead set
// curesStatus (a MajorStatus, or "all" for Full Heal) — exactly one of the
// two field pairs is ever set per item, never both. Returns null only for
// a genuinely malformed catalog entry (missing the field its own declared
// kind requires), in which case the caller simply omits the effect line
// rather than showing a wrong value.
export function gymBagItemEffectLabelHe(item: Pick<ShopItem, "medicineEffectKind" | "healPercent" | "curesStatus">): string | null {
  if (!item.medicineEffectKind) return null;

  if (item.medicineEffectKind === "cure-status") {
    if (!item.curesStatus) return null;
    return item.curesStatus === "all" ? "ריפוי: כל מצב סטטוס" : `ריפוי: ${MAJOR_STATUS_LABELS[item.curesStatus]}`;
  }

  if (item.healPercent === undefined) return null;
  const percent = Math.round(item.healPercent * 100);
  return item.medicineEffectKind === "revive" ? `החייאה: ${percent}% חיים` : `ריפוי: ${percent}%`;
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
    case "invalid-selection":
      return "בחירת הפוקימונים אינה תקינה";
    case "invalid-target":
      return "קרב לא תקין";
    default:
      return "לא ניתן להתחיל את הקרב";
  }
}
