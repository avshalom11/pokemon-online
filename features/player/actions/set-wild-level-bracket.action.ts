"use server";

import { revalidatePath } from "next/cache";

import { setWildLevelBracketPreference, type SetWildLevelBracketResult } from "@/features/player/services/wild-level-preference.service";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

export type SetWildLevelBracketActionResult = SetWildLevelBracketResult | { status: "error" };

// MAP — SELECTABLE WILD LEVEL RANGE. The only write path the Map page's
// selector has for persisting a chosen bracket — same session -> profile ->
// service -> revalidatePath shape every other Map/Inventory action already
// follows. Every real guard (in-bounds index, unlocked-for-this-player's-
// current-level) lives server-side in setWildLevelBracketPreference itself
// — this action never trusts or re-derives that on its own, and the client
// never gets to bypass it by calling this with an arbitrary index.
export async function setWildLevelBracketAction(bracketIndex: number): Promise<SetWildLevelBracketActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  if (!Number.isInteger(bracketIndex)) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await setWildLevelBracketPreference(profile.id, bracketIndex);

  revalidatePath("/map");
  return result;
}
