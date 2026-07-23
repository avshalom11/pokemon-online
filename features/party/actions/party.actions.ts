"use server";

import { revalidatePath } from "next/cache";

import {
  assignToPartySlot,
  removeFromParty,
  swapPartySlots,
  type PartyMutationResult,
} from "@/features/party/services/party-management.service";
import {
  assignPartySlotSchema,
  removePartySlotSchema,
  swapPartySlotsSchema,
} from "@/features/party/validation/party.schema";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Plain async-callable Server Actions (not <form> actions) — same pattern
// already used by attemptCaptureAction: these back an already-interactive
// panel (My Pokémon's party editor, the battle switch selector), so the
// caller wants an inline result, not a page navigation. Every action
// resolves the caller's own profile id from the session itself — a client
// can request an operation, but never supply which player it applies to.

export type PartyActionResult = PartyMutationResult | { status: "error" };

export async function assignPartySlotAction(playerPokemonId: string, slotIndex: number): Promise<PartyActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = assignPartySlotSchema.safeParse({ playerPokemonId, slotIndex });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await assignToPartySlot(profile.id, parsed.data.playerPokemonId, parsed.data.slotIndex);

  revalidatePath("/my-pokemon");
  return result;
}

export async function removePartySlotAction(playerPokemonId: string): Promise<PartyActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = removePartySlotSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await removeFromParty(profile.id, parsed.data.playerPokemonId);

  revalidatePath("/my-pokemon");
  return result;
}

export async function swapPartySlotsAction(slotIndexA: number, slotIndexB: number): Promise<PartyActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = swapPartySlotsSchema.safeParse({ slotIndexA, slotIndexB });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await swapPartySlots(profile.id, parsed.data.slotIndexA, parsed.data.slotIndexB);

  revalidatePath("/my-pokemon");
  return result;
}
