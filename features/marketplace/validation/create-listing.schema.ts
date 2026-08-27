import { z } from "zod";

// MARKETPLACE PHASE 2 — the shape createMarketplaceListing accepts. Never
// includes sellerId — that is always resolved server-side from the
// authenticated session (features/marketplace/actions/create-listing.action.ts),
// never trusted from the caller, same "never a client-suppliable identity
// field" posture as the rest of this codebase's own mutating actions.
export const createListingItemSchema = z.object({
  itemId: z.string().min(1, { error: "יש לבחור פריט" }),
  quantity: z.number().int({ error: "הכמות חייבת להיות מספר שלם" }).positive({ error: "הכמות חייבת להיות גדולה מאפס" }),
});

export const createListingSchema = z
  .object({
    playerPokemonIds: z.array(z.string().min(1)).default([]),
    items: z.array(createListingItemSchema).default([]),
    // Money/Gold price — "at least one must be positive" is enforced below
    // by the object-level refine, not per-field, since either alone is a
    // valid price.
    priceMoney: z.number().int({ error: "מחיר לא תקין" }).min(0, { error: "מחיר לא יכול להיות שלילי" }).default(0),
    priceGold: z.number().int({ error: "מחיר לא תקין" }).min(0, { error: "מחיר לא יכול להיות שלילי" }).default(0),
  })
  .refine((data) => data.playerPokemonIds.length > 0 || data.items.length > 0, {
    error: "יש לכלול לפחות פוקימון אחד או פריט אחד ברשימה",
    path: ["playerPokemonIds"],
  })
  .refine((data) => data.priceMoney > 0 || data.priceGold > 0, {
    error: "יש להגדיר מחיר בכסף, בזהב, או בשניהם",
    path: ["priceMoney"],
  })
  .refine((data) => new Set(data.playerPokemonIds).size === data.playerPokemonIds.length, {
    error: "לא ניתן לכלול אותו פוקימון פעמיים באותה רשימה",
    path: ["playerPokemonIds"],
  })
  .refine((data) => new Set(data.items.map((item) => item.itemId)).size === data.items.length, {
    error: "לא ניתן לכלול אותו פריט פעמיים באותה רשימה",
    path: ["items"],
  });

export type CreateListingInput = z.input<typeof createListingSchema>;
export type CreateListingItemInput = z.infer<typeof createListingItemSchema>;
