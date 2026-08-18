"use server";

import { revalidatePath } from "next/cache";

import { executeGymBattleAction, type GymBattleActionResult } from "@/features/gyms/services/gym-battle-action.service";
import { useGymBattleItem, type UseGymBattleItemResult } from "@/features/gyms/services/gym-battle-item.service";
import { getInventoryView } from "@/features/inventory/services/inventory-view.service";
import type { InventoryItemView } from "@/features/inventory/types/inventory.types";
import { voluntarySwitchNpcBattleActivePokemon, type VoluntarySwitchResult } from "@/features/gyms/services/gym-battle-switch.service";
import { getGymBattleViewData, type GymBattleViewResult } from "@/features/gyms/services/gym-battle-view.service";
import {
  abandonNpcBattleSession,
  getGymBattlePartyOptions,
  startNpcBattle,
  switchNpcBattleActivePokemon,
  type GymPartySelectionResult,
  type StartNpcBattleResult,
  type StartNpcBattleTarget,
  type SwitchNpcBattleActivePokemonResult,
} from "@/features/gyms/services/gym-battle-session.service";
import {
  executeGymBattleActionSchema,
  startGymBattleTargetSchema,
  switchGymBattleActivePokemonSchema,
} from "@/features/gyms/validation/gym-battle.schema";
import { getCurrentSession, getCurrentSessionFast } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// PRE-BATTLE PARTY SELECTION (later task) — the selection screen's own
// read-only data call. Never creates a session; safe to call repeatedly
// while the player is still choosing.
export async function getGymBattlePartySelectionAction(target: StartNpcBattleTarget): Promise<GymPartySelectionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "invalid-target" };

  const parsed = startGymBattleTargetSchema.safeParse(target);
  if (!parsed.success) return { status: "invalid-target" };

  const profile = await getPlayerProfile(session.user.id);
  return getGymBattlePartyOptions(profile.id, parsed.data as StartNpcBattleTarget);
}

// GYMS & LEAGUES PHASE 4 — the Server Action surface GymsContent (/gyms)
// and GymBattleContent (/gyms/battle) call through. Every action derives
// playerId from the authenticated session only (never a client-supplied
// id); ownership/unlock/completion are re-validated again inside the
// service layer regardless (see startNpcBattle/executeGymBattleAction's own
// doc comments) — this file adds nothing beyond session + schema
// validation before delegating.

export async function startGymBattleAction(
  target: StartNpcBattleTarget,
  selectedPlayerPokemonIds: readonly string[]
): Promise<StartNpcBattleResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "invalid-target" };

  const parsed = startGymBattleTargetSchema.safeParse(target);
  if (!parsed.success) return { status: "invalid-target" };
  if (!Array.isArray(selectedPlayerPokemonIds) || selectedPlayerPokemonIds.some((id) => typeof id !== "string")) {
    return { status: "invalid-selection" };
  }

  const profile = await getPlayerProfile(session.user.id);
  const result = await startNpcBattle(profile.id, parsed.data as StartNpcBattleTarget, selectedPlayerPokemonIds);

  revalidatePath("/gyms");
  return result;
}

// GYM BATTLE PERFORMANCE — uses getCurrentSessionFast, same reasoning
// executeBattleActionAction (Field Battle's own attack action) already
// documents: this can only ever be called from an already-mounted
// /gyms/battle screen, which requires the full getCurrentSession() self-heal
// check to have already run moments earlier via app/(game)/layout.tsx and
// app/(game)/gyms/battle/page.tsx.
export async function executeGymBattleActionAction(moveId: string): Promise<GymBattleActionResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "no-session" };

  const parsed = executeGymBattleActionSchema.safeParse({ moveId });
  if (!parsed.success) return { status: "invalid-move", moveId };

  const profile = await getPlayerProfile(session.user.id);
  const result = await executeGymBattleAction(profile.id, parsed.data.moveId);

  // RESULT DIALOG MUST WAIT FOR CONFIRMATION (later task) — deliberately
  // NEVER calls revalidatePath here, even on a victory. See this file's own
  // doc comment on confirmGymBattleResultAction below for why: doing so
  // used to force a same-response server re-render of the CURRENT route
  // (/gyms/battle) — see the Next.js Server Actions docs' own "a single
  // response carries data and UI" behavior — which re-ran the page's own
  // "no active session -> redirect" guard the instant the winning
  // transaction deleted the session, yanking the player to /gyms before the
  // result dialog could even be read. Revalidation is deferred to
  // confirmGymBattleResultAction, called only once the player explicitly
  // clicks "אישור".
  return result;
}

// GymBattleContent's own "give me the current, full display state" call —
// used after every attack/switch so the client never has to hand-patch a
// partial view itself (a new active NPC after a KO needs its own
// species/level/sprite, which the turn-action result alone doesn't carry).
export async function getGymBattleViewDataAction(): Promise<GymBattleViewResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "no-session" };

  const profile = await getPlayerProfile(session.user.id);
  return getGymBattleViewData(profile.id, profile.displayName);
}

export async function switchGymBattleActivePokemonAction(playerPokemonId: string): Promise<SwitchNpcBattleActivePokemonResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "no-session" };

  const parsed = switchGymBattleActivePokemonSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "not-owned" };

  const profile = await getPlayerProfile(session.user.id);
  return switchNpcBattleActivePokemon(profile.id, parsed.data.playerPokemonId);
}

// ESCAPE/ABANDON (Phase 3, section 13; confirmation added later task,
// section 13) — the only Server Action a Gym battle screen's confirmed
// "פרישה" flow ever calls; never marks any completion, exactly like the
// underlying service primitive. The confirmation step itself lives entirely
// client-side (GymBattleContent) — this action is only ever reached AFTER
// the player has explicitly confirmed, never on a bare menu tap.
export async function abandonGymBattleAction(): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const profile = await getPlayerProfile(session.user.id);
  await abandonNpcBattleSession(profile.id);
  revalidatePath("/gyms");
}

// VOLUNTARY SWITCH (later task, section 5) — distinct from
// switchGymBattleActivePokemonAction above (that one is the FREE, no-turn-
// cost forced-replacement path, unchanged): this one also lets the NPC
// opponent take its own free strike against the newly-active Pokémon,
// since choosing to switch mid-fight consumes the player's own turn.
export async function voluntarySwitchGymBattleActivePokemonAction(playerPokemonId: string): Promise<VoluntarySwitchResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "no-session" };

  const parsed = switchGymBattleActivePokemonSchema.safeParse({ playerPokemonId });
  if (!parsed.success) return { status: "not-owned" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await voluntarySwitchNpcBattleActivePokemon(profile.id, parsed.data.playerPokemonId);

  // RESULT DIALOG MUST WAIT FOR CONFIRMATION (later task) — no
  // revalidatePath here; see executeGymBattleActionAction's own doc
  // comment. (A free strike can never itself produce victoryCompleted —
  // this path never needs it regardless — but kept revalidation-free for
  // the same reason and for consistency.)
  return result;
}

// BAG DURING GYM BATTLE (later task, section 4) — server-side ownership/
// usability validation, exact consumption, and the resulting NPC free
// strike all happen inside useGymBattleItem itself; this action is only
// session/schema plumbing, same convention as every other Gym battle action
// here.
// BAG DURING GYM BATTLE (later task, section 4) — the Bag panel's own
// read-only item list, reusing the EXACT same Inventory view (features/
// inventory/services/inventory-view.service.ts, "quantity joined against
// the Shop catalog") every other Bag screen in the project already reads
// through — never a Gym-specific inventory table or a second catalog join.
// Filtered to owned potions only (section 4's own scope: Potions/Revive/Max
// Revive, never Poké Balls or anything else), quantity>0 already guaranteed
// by getOwnedInventoryItems itself.
export async function getGymBattleBagItemsAction(): Promise<InventoryItemView[]> {
  const session = await getCurrentSessionFast();
  if (!session) return [];

  const profile = await getPlayerProfile(session.user.id);
  const items = await getInventoryView(profile.id);
  return items.filter((view) => view.item.categoryId === "potions");
}

export async function useGymBattleItemAction(itemId: string, targetPlayerPokemonId: string): Promise<UseGymBattleItemResult> {
  const session = await getCurrentSessionFast();
  if (!session) return { status: "no-session" };

  if (typeof itemId !== "string" || typeof targetPlayerPokemonId !== "string") {
    return { status: "invalid-item" };
  }

  const profile = await getPlayerProfile(session.user.id);
  const result = await useGymBattleItem(profile.id, itemId, targetPlayerPokemonId);

  // RESULT DIALOG MUST WAIT FOR CONFIRMATION (later task) — no
  // revalidatePath here; see executeGymBattleActionAction's own doc
  // comment. (Same "a free strike can never grant victoryCompleted" note
  // as voluntarySwitchGymBattleActivePokemonAction above.)
  return result;
}

// RESULT DIALOG MUST WAIT FOR CONFIRMATION (later task) — the revalidation
// every winning battle-ending action USED to perform immediately (Money/XP/
// Badge/Medal/Chest changes landing on Home/Inventory/the Gym page) is now
// deferred to here, called ONLY from the result dialog's own "אישור"
// confirm handler (GymBattleContent's confirmVictory), right before it
// navigates back to /gyms. This is the ONE place that revalidation for a
// completed Gym/Regional-Champion battle happens — never automatically as
// a side effect of the battle-ending action itself, which is exactly what
// was causing the current route (/gyms/battle) to be force-re-rendered
// server-side (and redirected away from, since the session had just been
// deleted) within the SAME response as the action that produced the result
// the player hadn't even seen yet. No session/ownership check is needed:
// this performs no player-specific read or write, only marks a small,
// fixed set of already-public route caches as stale for their next visit.
export async function confirmGymBattleResultAction(): Promise<void> {
  revalidatePath("/home");
  revalidatePath("/gyms");
  revalidatePath("/inventory");
}
