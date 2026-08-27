"use server";

import type { PokemonMarketUnavailableReason } from "@/features/marketplace/services/pokemon-availability.service";
import { saveEditListing } from "@/features/marketplace/services/save-edit-listing.service";
import type { CreateListingInput } from "@/features/marketplace/validation/create-listing.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type SaveEditListingActionResult = { status: "success" } | { status: "error"; message: string };

const POKEMON_UNAVAILABLE_MESSAGES: Record<PokemonMarketUnavailableReason, string> = {
  "not-owned": "אחד הפוקימונים שנבחרו אינו שייך לך.",
  "is-starter": "לא ניתן למכור את הפוקימון ההתחלתי המקורי.",
  "in-daycare": "לא ניתן למכור פוקימון שנמצא כרגע במעון.",
  "in-field-battle": "לא ניתן למכור פוקימון שנמצא כרגע בקרב.",
  "in-gym-battle": "לא ניתן למכור פוקימון שנמצא כרגע בקרב מכון או אלוף אזורי.",
  "in-league-battle": "לא ניתן למכור פוקימון שנמצא כרגע בקרב ליגה.",
  "already-listed": "הפוקימון כבר רשום למכירה בליסטינג אחר.",
};

function getSaveEditErrorMessage(result: Exclude<Awaited<ReturnType<typeof saveEditListing>>, { status: "success" }>): string {
  if (result.status === "invalid-input") return result.message;
  if (result.status === "pokemon-unavailable") return POKEMON_UNAVAILABLE_MESSAGES[result.reason];
  if (result.status === "insufficient-item-quantity") return "אין מספיק כמות פנויה מהפריט שנבחר.";
  if (result.status === "not-owner") return "ניתן לשמור עריכה רק של מכירה שפרסמת בעצמך.";
  return "המכירה כבר אינה במצב עריכה — יש לבדוק את הפרטים המעודכנים.";
}

// MARKETPLACE PHASE 6 — the one entry point the (reused) create-listing UI
// calls when it's operating in edit mode. `sellerId` is never a parameter
// here at all: resolved entirely from the authenticated session
// server-side, same "never a client-suppliable identity field" posture as
// create-listing.action.ts/purchase-listing.action.ts. Collapses every
// failure to one generic {status:"error", message} shape, same convention
// create-listing.action.ts's own save/creation flow already uses (unlike
// purchase/cancel, saving an edit has no external-staleness case worth a
// dedicated auto-refresh branch — a "listing-unavailable" here almost
// always means the seller's own edit session already ended some other way,
// which the UI already handles by closing the modal on any terminal
// outcome).
export async function saveEditListingAction(listingId: string, input: CreateListingInput): Promise<SaveEditListingActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  const profile = await getPlayerProfile(session.user.id);
  const result = await saveEditListing(profile.id, listingId, input);

  if (result.status === "success") {
    return { status: "success" };
  }

  return { status: "error", message: getSaveEditErrorMessage(result) };
}
