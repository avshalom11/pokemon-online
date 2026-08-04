// Hebrew wording for the evolution feature — same "one dedicated
// -messages.ts per domain" precedent
// features/battle/utils/battle-messages.ts and
// features/shop/messages/shop-purchase-messages.ts already established.

export const evolutionPromptTitle = "הפוקימון שלך מוכן להתפתח!";

export function evolutionPromptMessage(currentPokemonName: string, evolvedPokemonName: string): string {
  return `ברכות! ${currentPokemonName} הגיע לרמה המתאימה ויכול להתפתח ל־${evolvedPokemonName}. האם לאפשר את ההתפתחות?`;
}

export const evolutionRejectWarning =
  "אם תבחר שלא להתפתח, פוקימון זה יישאר בצורתו הנוכחית ולא יוכל להתפתח בעתיד.";

// SHOP_PURCHASE/SHOP_SELL-style persistent notification, created only on a
// successful accept (features/evolution/services/accept-evolution.service.ts)
// — never on rejection, and never for the pending decision itself, per this
// phase's own "do not notify on reject" rule.
export function evolutionSucceededMessage(oldName: string, newName: string): string {
  return `מזל טוב! ${oldName} התפתח ל־${newName}!`;
}

// Evolution-Item evolution (Inventory) — reuses evolutionPromptTitle above
// as-is (same dialog title either way), but has its own message (names the
// item) and deliberately no reject-warning counterpart: cancelling an
// evolution-item evolution is never permanent, so EvolutionItemConfirmDialog
// has nothing equivalent to show. Covers both Stones and the former
// Trade-item evolutions (King's Rock, Metal Coat, Dragon Scale, Upgrade) —
// no trade of any kind is ever involved.
export function evolutionItemPromptMessage(currentPokemonName: string, evolvedPokemonName: string, itemName: string): string {
  return `${currentPokemonName} יכול להתפתח ל־${evolvedPokemonName} באמצעות ${itemName}. האם לאפשר את ההתפתחות?`;
}

export const noEligibleEvolutionItemPokemonMessage = "אין לך כרגע פוקימונים שיכולים להתפתח באמצעות פריט זה.";

// Branch Evolution (Eevee's explicit Espeon/Umbreon choice at level 16) —
// the first step of a two-step flow: choose a target, then confirm via the
// normal EvolutionPromptDialog exactly like any other level evolution (see
// evolution-progress.service.ts's chooseEvolutionBranch).
export const evolutionBranchChoiceTitle = "הפוקימון שלך מוכן להתפתח — בחר כיוון!";

export function evolutionBranchChoiceMessage(currentPokemonName: string): string {
  return `${currentPokemonName} הגיע לרמה המתאימה ויכול להתפתח לאחת מכמה צורות. בחר לאיזו צורה להתפתח.`;
}
