"use server";

import { revalidatePath } from "next/cache";

import {
  resolvePendingMoveLearn,
  declinePendingMove,
} from "@/features/move-learning/move-learning-service";
import { getPendingMoveLearningView, type PendingMoveLearningView } from "@/features/move-learning/move-learning-view.service";
import {
  resolvePendingMoveLearnSchema,
  declinePendingMoveSchema,
  pendingMoveLearningViewSchema,
} from "@/features/move-learning/validation/move-learning.schema";
import type { ResolvePendingMoveLearnResult, DeclinePendingMoveResult } from "@/engine/move-learning";
import { prisma } from "@/lib/db/prisma";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// Plain async-callable Server Actions — same pattern as
// features/party/actions/party.actions.ts and
// features/pokemon/actions/release-pokemon.action.ts. Every action
// resolves the caller's own profile id from the session itself; a client
// can request an operation but never supply which player it applies to.
//
// resolvePendingMoveLearn/declinePendingMove (features/move-learning's
// service) take only a pendingId — by design (see that file's own doc
// comments), since resolving a pending decision is a standalone,
// independent action, not a step nested inside a larger transaction.
// Ownership is therefore verified here, at the action boundary, before
// either service function is ever called: a pendingId that doesn't
// belong to a PlayerPokemon owned by the current session is rejected
// with "not-owned" without touching the pending row at all.

export type PendingMoveViewActionResult = { status: "ok"; view: PendingMoveLearningView } | { status: "error" };

export async function getPendingMoveLearningViewAction(playerPokemonId: string): Promise<PendingMoveViewActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = pendingMoveLearningViewSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const owned = await prisma.playerPokemon.findFirst({
    where: { id: parsed.data.playerPokemonId, playerId: profile.id },
    select: { id: true },
  });
  if (!owned) return { status: "error" };

  const view = await getPendingMoveLearningView(parsed.data.playerPokemonId);
  return { status: "ok", view };
}

export type ResolvePendingMoveLearnActionResult = ResolvePendingMoveLearnResult | { status: "not-owned" } | { status: "error" };

export async function resolvePendingMoveLearnAction(
  pendingId: string,
  slot: number
): Promise<ResolvePendingMoveLearnActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = resolvePendingMoveLearnSchema.safeParse({ pendingId, slot });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const owned = await isPendingOwnedByPlayer(parsed.data.pendingId, profile.id);
  if (!owned) return { status: "not-owned" };

  const result = await resolvePendingMoveLearn(parsed.data.pendingId, parsed.data.slot);

  revalidatePath("/my-pokemon");
  return result;
}

export type DeclinePendingMoveActionResult = DeclinePendingMoveResult | { status: "not-owned" } | { status: "error" };

export async function declinePendingMoveAction(pendingId: string): Promise<DeclinePendingMoveActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const parsed = declinePendingMoveSchema.safeParse({ pendingId });
  if (!parsed.success) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const owned = await isPendingOwnedByPlayer(parsed.data.pendingId, profile.id);
  if (!owned) return { status: "not-owned" };

  const result = await declinePendingMove(parsed.data.pendingId);

  revalidatePath("/my-pokemon");
  return result;
}

async function isPendingOwnedByPlayer(pendingId: string, playerId: string): Promise<boolean> {
  const pending = await prisma.playerPendingMoveLearning.findUnique({
    where: { id: pendingId },
    select: { playerPokemon: { select: { playerId: true } } },
  });
  return pending?.playerPokemon.playerId === playerId;
}
