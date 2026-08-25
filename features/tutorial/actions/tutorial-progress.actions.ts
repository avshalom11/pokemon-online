"use server";

import {
  advanceTutorialStage,
  advanceTutorialSubStep,
  claimTutorialReward,
  getTutorialProgressView,
} from "@/features/tutorial/services/tutorial-progress.service";
import type { TutorialProgressView } from "@/features/tutorial/types/tutorial.types";
import { getCurrentSession } from "@/lib/auth/auth-session";
import { getPlayerProfile } from "@/lib/auth/player-profile";

// GAME TUTORIAL — PHASE 0. Plain async-callable Server Actions — same
// pattern as features/move-learning/actions/move-learning.actions.ts: every
// action resolves the caller's own profile id from the session itself, a
// client can request "advance my tutorial" but never supply which player it
// applies to.
export type TutorialProgressActionResult = { status: "ok"; view: TutorialProgressView } | { status: "error" };

// Ensures a PlayerTutorialProgress row exists and returns its current view
// — idempotent, callable any number of times. The (game) layout already
// does this server-side on every render (see tutorial-progress.service.ts's
// own doc comment on getOrCreateTutorialProgress); this action exists for a
// client that needs to (re)confirm the authoritative server state without a
// full page reload.
export async function startTutorialAction(): Promise<TutorialProgressActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const view = await getTutorialProgressView(profile.id);
  return { status: "ok", view };
}

// The one real mutation this phase has: moves the player to the next stage
// (or marks the tutorial completed, from the last stage) — see
// advanceTutorialStage's own doc comment for the exact CAS-guarded update.
// Used by TutorialPanel's own CTA button ("התחל את הכרת המשחק" / "בצע").
export async function advanceTutorialStageAction(): Promise<TutorialProgressActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const view = await advanceTutorialStage(profile.id);
  return { status: "ok", view };
}

// PHASE 1 — NAVIGATION + SPOTLIGHT. Advances exactly one sub-step within
// the player's currently-active multi-step stage (see advanceTutorialSubStep
// above) — called by TutorialContext the instant a real navigation/action
// signal for that sub-step is detected client-side. Never advances the
// whole stage itself (advanceTutorialStageAction does that separately, once
// every sub-step — and any wrap-up panel — is done).
export async function advanceTutorialSubStepAction(): Promise<TutorialProgressActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const view = await advanceTutorialSubStep(profile.id);
  return { status: "ok", view };
}

// Postponing never changes stage/sub-step — progress is already fully
// persisted the moment the player last advanced (see
// advanceTutorialStageAction above), so there is nothing new to write here.
// This action's job is only to hand the client back the authoritative
// server view right before it closes the panel, so "אעשה זאת מאוחר יותר"
// never leaves the client trusting anything but a freshly-confirmed server
// read.
export async function postponeTutorialAction(): Promise<TutorialProgressActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const view = await getTutorialProgressView(profile.id);
  return { status: "ok", view };
}

// GAME TUTORIAL — PHASE 4 — COMPLETION REWARD. Claims the one-time
// completion reward and marks the Tutorial completed — see
// claimTutorialReward's own doc comment (tutorial-progress.service.ts) for
// the exact atomic, exactly-once guarantee. Used by TutorialPanel's own
// "קבל את הפרס" CTA on the Completion stage — never callable from anywhere
// else in the UI, and a safe no-op server-side even if it were.
export async function claimTutorialRewardAction(): Promise<TutorialProgressActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const view = await claimTutorialReward(profile.id);
  return { status: "ok", view };
}

// Same shape as postponeTutorialAction above — re-confirms the
// authoritative server state right before HomeTutorialCard's "המשך הכרת
// המשחק" button reopens the panel, so a resume always shows exactly where
// the player's persisted progress actually is, never a stale client value.
export async function resumeTutorialAction(): Promise<TutorialProgressActionResult> {
  const session = await getCurrentSession();
  if (!session) return { status: "error" };

  const profile = await getPlayerProfile(session.user.id);
  const view = await getTutorialProgressView(profile.id);
  return { status: "ok", view };
}
