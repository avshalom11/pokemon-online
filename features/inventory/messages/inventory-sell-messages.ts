import type { CurrencyType } from "@/features/currency/types/currency.types";

// Hebrew wording for the persistent notification a successful Inventory
// sale creates (features/notifications/) — same "one dedicated
// -messages.ts per reward/event domain" precedent
// features/shop/messages/shop-purchase-messages.ts already established.
export function inventorySellMessage(itemName: string, quantity: number, amount: number, currency: CurrencyType): string {
  const currencyLabel = currency === "gold" ? "זהב" : "כסף";
  return `מכרת ${quantity} × ${itemName} וקיבלת ${amount} ${currencyLabel}.`;
}
