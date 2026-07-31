// Hebrew wording for the persistent notification a successful Shop purchase
// creates (features/notifications/) — same "one dedicated -messages.ts per
// reward/event domain" precedent
// features/currency/messages/field-battle-currency-messages.ts and
// features/player-progression/progression-messages.ts already established.
export function shopPurchaseMessage(itemName: string, quantity: number): string {
  return `רכשת ${quantity} יחידות של ${itemName} בהצלחה.`;
}
