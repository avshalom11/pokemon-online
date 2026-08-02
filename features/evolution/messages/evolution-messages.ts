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

// Stone-Based Evolution (Inventory) — reuses evolutionPromptTitle above
// as-is (same dialog title either way), but has its own message (names the
// stone) and deliberately no reject-warning counterpart: cancelling a stone
// evolution is never permanent, so StoneEvolutionConfirmDialog has nothing
// equivalent to show.
export function stoneEvolutionPromptMessage(currentPokemonName: string, evolvedPokemonName: string, stoneName: string): string {
  return `${currentPokemonName} יכול להתפתח ל־${evolvedPokemonName} באמצעות ${stoneName}. האם לאפשר את ההתפתחות?`;
}

export const noEligibleStonePokemonMessage = "אין לך כרגע פוקימונים שיכולים להתפתח באמצעות אבן זו.";
