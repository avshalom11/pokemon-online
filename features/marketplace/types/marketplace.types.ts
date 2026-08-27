// MARKETPLACE PHASE 1 — the app-layer validated string union behind
// MarketplaceListing.status (plain string column, no Prisma enum — same
// convention every other status-ish column in this project already follows,
// e.g. LeagueBattleSession.status). Deliberately no "expired" value — this
// feature's own confirmed product rules say listings never expire.
//
// State machine (enforced by the later create/buy/edit/cancel service
// layer via a guarded conditional updateMany keyed on the CURRENT status,
// never a version counter — see MarketplaceListing's own schema doc
// comment):
//   active   -> editing    (seller enters edit mode; listing becomes unbuyable)
//   editing  -> active     (seller cancels edit; listing restored unchanged)
//   editing  -> active     (seller saves edit; assets released/locked atomically)
//   active   -> sold       (a buyer purchases the whole listing)
//   active   -> cancelled  (seller cancels; assets returned)
//   editing  -> cancelled  (seller cancels while editing; assets returned)
// "sold" and "cancelled" are terminal — no transition ever leaves either.
export type MarketplaceListingStatus = "active" | "editing" | "sold" | "cancelled";

// Every valid status value, for app-layer validation (e.g. Zod) — kept as a
// plain array derived from the type above so the two can never drift apart.
export const MARKETPLACE_LISTING_STATUSES: readonly MarketplaceListingStatus[] = [
  "active",
  "editing",
  "sold",
  "cancelled",
];

// A listing is buyable/editable-into only from this one status — the single
// source of truth for "still active" every later guarded updateMany should
// key its WHERE clause on, rather than re-typing the literal "active"
// string at each call site.
export const MARKETPLACE_LISTING_BUYABLE_STATUS: MarketplaceListingStatus = "active";
