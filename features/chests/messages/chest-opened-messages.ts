// Hebrew wording for the persistent notification a successful chest
// opening creates (features/notifications/) — same "one dedicated
// -messages.ts per reward/event domain" precedent
// features/shop/messages/shop-purchase-messages.ts/features/inventory/
// messages/inventory-sell-messages.ts already established. One
// notification per OPENING (summarizing the chest type), never one per
// individual reward inside it.
export function chestOpenedMessage(chestDisplayName: string): string {
  return `פתחת ${chestDisplayName} וקיבלת פרסים!`;
}
