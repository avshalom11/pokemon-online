// POKÉMON DAYCARE — PHASE 1 — SECTION 13 (time until next level). Pure
// formatting only — the ms value itself always comes from the server's own
// calculateDaycareProgress (daycare-calculations.ts), never computed here;
// this only turns a millisecond count into the Hebrew "רמה הבאה בעוד: X
// שעות ו־Y דקות" display string, matching this feature's own approved
// wording. Display-only, same as every caller of this function.
export function formatDaycareCountdown(msRemaining: number): string {
  const safeMs = Math.max(0, msRemaining);
  const totalMinutes = Math.ceil(safeMs / (60 * 1000));
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;

  if (hours === 0 && minutes === 0) return "רמה הבאה בעוד רגע";
  if (hours === 0) return `רמה הבאה בעוד: ${minutes} דקות`;
  if (minutes === 0) return `רמה הבאה בעוד: ${hours} שעות`;
  return `רמה הבאה בעוד: ${hours} שעות ו־${minutes} דקות`;
}
