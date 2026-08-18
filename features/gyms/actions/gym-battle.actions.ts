"use server";

import { revalidatePath } from "next/cache";

import { executeGymBattleAction, type GymBattleActionResult } from "@/features/gyms/services/gym-battle-action.service";
import { getGymBattleViewData, type GymBattleViewResult } from "@/features/gyms/services/gym-battle-view.service";
import {
  abandonNpcBattleSession,
  startNpcBattle,
  switchNpcBattleActivePokemon,
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

// GYMS & LEAGUES PHASE 4 — the Server Action surface GymsContent (/gyms)
// and GymBattleContent (/gyms/battle) call through. Every action derives
// playerId from the authenticated session only (never a client-supplied
// id); ownership/unlock/completion are re-validated again inside the
// service layer regardless (see startNpcBattle/executeGymBattleAction's own
// doc comments) — this file adds nothing beyond session + schema
// validation before delegating.

export async function startGymBattleAction(target: StartNpcBattleTarget): Promise<StartNpcBattleResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "invalid-target" };

  const parsed = startGymBattleTargetSchema.safeParse(target);
  if (!parsed.success) return { status: "invalid-target" };

  const profile = await getPlayerProfile(session.user.id);
  const result = await startNpcBattle(profile.id, parsed.data as StartNpcBattleTarget);

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

  if (result.status === "success" && result.victoryCompleted) {
    // Same revalidation pattern Field Battle's own action uses whenever a
    // reward actually changed something a pre-cached route displays —
    // Money/XP/Badge/Medal/Chest all land on Home/Inventory/the Gym page
    // itself.
    revalidatePath("/home");
    revalidatePath("/gyms");
    revalidatePath("/inventory");
  }

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

// ESCAPE/ABANDON (Phase 3, section 13) — the only Server Action a Gym
// battle screen's "leave"/navigate-away flow ever calls; never marks any
// completion, exactly like the underlying service primitive.
export async function abandonGymBattleAction(): Promise<void> {
  const session = await getCurrentSession();
  if (!session) return;

  const profile = await getPlayerProfile(session.user.id);
  await abandonNpcBattleSession(profile.id);
  revalidatePath("/gyms");
}
