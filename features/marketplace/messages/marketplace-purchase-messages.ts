// Hebrew wording for the persistent notification a successful Marketplace
// purchase creates for the SELLER (features/notifications/) — same "one
// dedicated -messages.ts per reward/event domain" precedent
// features/shop/messages/shop-purchase-messages.ts already established.
//
// Format (fixed, matches the task's own example):
//   המשתמש {buyerUsername} קנה ממך:
//   {פוקימון א}
//   {פוקימון ב}
//   {כמות}× {פריט א}
//   {כמות}× {פריט ב}
// Pokémon lines first (bare display name, one per line), then item lines
// (`{quantity}× {itemName}`) — either list may be empty (a listing can be
// all-Pokémon or all-items), but never both (a listing always has at least
// one asset).
export function marketplaceSaleNotificationMessage(
  buyerUsername: string,
  pokemonNames: string[],
  items: { name: string; quantity: number }[]
): string {
  const lines = [
    ...pokemonNames,
    ...items.map(({ name, quantity }) => `${quantity}× ${name}`),
  ];
  return `המשתמש ${buyerUsername} קנה ממך:\n${lines.join("\n")}`;
}
