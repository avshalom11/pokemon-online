// STAFF / MODERATION — PHASE 5. The one shared "minutes -> Hebrew label"
// formatter for every duration this feature's UI ever displays (OWNER's
// duration picker options, and the progressive-duration preview text —
// e.g. "הרחקה מהצ'אט — 12 שעות") — never a second, independently-worded
// copy of the same six/five canonical values. Deliberately no
// "server-only" import — pure formatting, safe for a Client Component.
export function formatDurationMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} דקות`;
  if (minutes < 24 * 60) {
    const hours = minutes / 60;
    return hours === 1 ? "שעה" : `${hours} שעות`;
  }
  const days = minutes / (24 * 60);
  return days === 1 ? "יום" : `${days} ימים`;
}
