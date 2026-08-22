"use server";

import { revalidatePath } from "next/cache";

import { collectFromDaycareSchema, depositToDaycareSchema } from "@/features/daycare/validation/daycare.schema";
import { collectFromDaycare, depositToDaycare } from "@/features/daycare/services/daycare.service";
import { getDaycareViewData } from "@/features/daycare/services/daycare-view.service";
import type { CollectFromDaycareResult, DaycareViewData, DepositToDaycareResult } from "@/features/daycare/types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Thin Server Action wrappers — same shape as every other action file in
// this codebase (resolve the session, resolve the profile, delegate to the
// service). Identity is never trusted from the client: the player a
// deposit/pickup applies to is always this request's own real session,
// never a client-supplied playerId.

export async function depositToDaycareAction(playerPokemonId: string): Promise<DepositToDaycareResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const parsed = depositToDaycareSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { ok: false, error: "not-owned" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await depositToDaycare(profile.id, parsed.data.playerPokemonId);

  revalidatePath("/daycare");
  return result;
}

// PHASE 2 — 5 SLOTS. Pickup is now per-Pokémon — `playerPokemonId` says
// which of the player's (0-5) active stays to collect; the other stays are
// completely untouched by this call.
export async function collectFromDaycareAction(playerPokemonId: string): Promise<CollectFromDaycareResult> {
  const session = await getCurrentSession();
  if (!session) return { ok: false, error: "unauthenticated" };

  const parsed = collectFromDaycareSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { ok: false, error: "not-found" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await collectFromDaycare(profile.id, parsed.data.playerPokemonId);

  revalidatePath("/daycare");
  return result;
}

// The /daycare page's own light background-refresh target (Section 13 —
// "the SERVER remains authoritative for earned levels", never a client
// timer). Returns a safe empty view for an unauthenticated caller rather
// than throwing, same defensive shape as every other read action in this
// codebase (see e.g. getGlobalChatMessagesAction).
export async function getDaycareViewAction(): Promise<DaycareViewData> {
  const session = await getCurrentSession();
  if (!session) return { activeStays: [], eligiblePokemon: [], playerMoney: 0 };

  const profile = await getPlayerProfile(session.user.id);
  return getDaycareViewData(profile.id);
}
