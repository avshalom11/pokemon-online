// EGG DROP — CONFIRMATION DIALOG. Hebrew wording for the blocking "egg
// found" confirmation dialog shown after a field-battle victory drops an
// egg (features/battle/components/EggFoundDialog.tsx) — the exact spec
// wording, deliberately its own message module, same "found in battle" vs.
// "opened from Inventory"/"hatched" precedent chest-found-messages.ts
// already establishes for chests.
export function eggFoundMessage(pokemonName: string, eggDisplayName: string): string {
  return `איזה מזל! במהלך הקרב גילית ש־${pokemonName} השאיר מאחוריו ${eggDisplayName} — ומצאת אותה! הביצה נוספה לתיק שלך.`;
}
