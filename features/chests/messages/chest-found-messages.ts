// Hebrew wording for the blocking "chest found" confirmation dialog shown
// after a field-battle victory drops a chest (features/battle/components/
// ChestFoundDialog.tsx) — the exact recommended wording from this phase's
// own spec, deliberately its own message module rather than reusing
// chest-opened-messages.ts (a different moment: "found in battle" vs.
// "opened from Inventory").
export function chestFoundMessage(pokemonName: string, chestDisplayName: string): string {
  return `יש לך מזל! במהלך הקרב גילית ש־${pokemonName} החביא בקרבת מקום ${chestDisplayName} — ומצאת אותה! התיבה נוספה לתיק שלך.`;
}
