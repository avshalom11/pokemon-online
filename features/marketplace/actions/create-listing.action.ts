"use server";

import { createMarketplaceListing, type CreateListingResult } from "@/features/marketplace/services/create-listing.service";
import type { PokemonMarketUnavailableReason } from "@/features/marketplace/services/pokemon-availability.service";
import type { CreateListingInput } from "@/features/marketplace/validation/create-listing.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type CreateMarketplaceListingActionResult = { status: "success"; listingId: string } | { status: "error"; message: string };

const POKEMON_UNAVAILABLE_MESSAGES: Record<PokemonMarketUnavailableReason, string> = {
  "not-owned": "אחד הפוקימונים שנבחרו אינו שייך לך.",
  "is-starter": "לא ניתן למכור את הפוקימון ההתחלתי המקורי.",
  "in-daycare": "לא ניתן למכור פוקימון שנמצא כרגע במעון.",
  "in-field-battle": "לא ניתן למכור פוקימון שנמצא כרגע בקרב.",
  "in-gym-battle": "לא ניתן למכור פוקימון שנמצא כרגע בקרב מכון או אלוף אזורי.",
  "in-league-battle": "לא ניתן למכור פוקימון שנמצא כרגע בקרב ליגה.",
  "already-listed": "הפוקימון כבר רשום למכירה בליסטינג אחר.",
};

function getCreateListingErrorMessage(result: Exclude<CreateListingResult, { status: "success" }>): string {
  if (result.status === "invalid-input") return result.message;
  if (result.status === "pokemon-unavailable") return POKEMON_UNAVAILABLE_MESSAGES[result.reason];
  return "אין מספיק כמות פנויה מהפריט שנבחר.";
}

// MARKETPLACE PHASE 2 — the one entry point a later Create Listing UI calls.
// `sellerId` is never a parameter here at all: resolved entirely from the
// authenticated session server-side, same "never a client-suppliable
// identity field" posture as request-account-deletion.action.ts and every
// other mutating action in this codebase. `input` never includes it either
// (see createListingSchema's own doc comment).
export async function createMarketplaceListingAction(input: CreateListingInput): Promise<CreateMarketplaceListingActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error", message: "יש להתחבר מחדש." };

  const profile = await getPlayerProfile(session.user.id);
  const result = await createMarketplaceListing(profile.id, input);

  if (result.status === "success") {
    return { status: "success", listingId: result.listingId };
  }

  return { status: "error", message: getCreateListingErrorMessage(result) };
}
