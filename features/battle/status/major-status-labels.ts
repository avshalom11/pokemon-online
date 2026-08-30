import type { MajorStatus } from "./major-status";

// STATUS-HEALING ITEMS — noun-form Hebrew labels ("Poison", "Burn", ...),
// distinct from format-battle-events.ts's own STATUS_APPLIED_MESSAGE (verb
// phrases like "הורעל!" / "got poisoned!" for the battle log). Nothing in
// this project displayed a Pokémon's current status as a standalone label
// before this feature — the Inventory status-cure panel
// (features/inventory/components/MedicineStatusPanel.tsx) is the first
// consumer, showing "why" a given owned Pokémon is an eligible target.
export const MAJOR_STATUS_LABELS: Record<MajorStatus, string> = {
  burn: "כוויה",
  poison: "הרעלה",
  paralysis: "שיתוק",
  sleep: "שינה",
  freeze: "הקפאה",
};
