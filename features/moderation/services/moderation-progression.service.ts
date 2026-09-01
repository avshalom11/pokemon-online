import "server-only";

import { getChatBanDurationMinutesForOccurrence, isValidOwnerChatBanDurationMinutes } from "@/features/moderation/config/chat-ban-progression.config";
import { getSiteBanDurationMinutesForOccurrence, isValidOwnerSiteBanDurationMinutes } from "@/features/moderation/config/site-ban-progression.config";
import { getActiveChatBanId, getActivePermanentSiteBanId, getActiveSiteBanId } from "@/features/moderation/services/active-ban.service";
import type { ModerationActionType, StaffRole } from "@/features/moderation/types";
import { prisma } from "@/lib/db/prisma";

// STAFF / MODERATION — PHASE 1/3. The one place a progressive (DEPUTY/
// SUPPORT) or manual (OWNER) chat/site/permanent ban is actually recorded.
// PHASE 3 note: these functions are the low-level, transaction-owning
// "write the punishment" primitives — actor authorization, hierarchy, and
// reason validation are NOT this module's job; they live one layer up in
// features/moderation/services/chat-ban.service.ts /
// site-ban.service.ts / revoke-ban.service.ts (the "authoritative
// service" Phase 3 asked for), which call through to these after
// validating. Nothing in this codebase calls the Phase-3 orchestration
// layer from any reachable runtime path either — no Server Action, no
// chat/auth enforcement wiring yet.
//
// PROGRESSION COUNTING SCOPE — a deliberate design decision, not
// explicitly pinned down by the spec: "the punished USER'S previous
// chat-ban history" is read as EVERY chat ban this player has ever
// received, regardless of which role issued it — an OWNER's own manual
// ban still increments PlayerModerationCounters.chatBanCount (see
// recordManualChatBan below), so a later DEPUTY/SUPPORT progressive ban
// for the same player correctly continues the same sequence rather than
// silently resetting to "1st" just because the most recent punishment
// happened to be OWNER-issued. Revisit if product intent turns out to be
// "only DEPUTY/SUPPORT-issued bans count toward progression".
export interface ModerationActionRecord {
  id: string;
  targetPlayerId: string;
  actorPlayerId: string;
  actionType: ModerationActionType;
  reason: string | null;
  durationMinutes: number | null;
  expiresAt: Date | null;
  revokedAt: Date | null;
  revokedByPlayerId: string | null;
  revocationReason: string | null;
  targetResourceId: string | null;
  // STAFF / MODERATION — PHASE 6 — opaque structured data, populated only
  // by recordStaffRoleChange below (a `{ role: StaffRole }` payload) —
  // every other action creator in this file leaves it unset/null. Never
  // interpreted here; features/moderation/services/moderation-history-
  // view.service.ts is the one place a caller reads it back out.
  metadata: unknown;
  createdAt: Date;
}

export interface RecordPunishmentSuccess {
  ok: true;
  action: ModerationActionRecord;
  occurrence: number;
  durationMinutes: number;
  expiresAt: Date;
}

// STAFF / MODERATION PHASE 3 — "already-banned" is the one expected
// business rejection every timed-punishment recorder below can produce
// (the target already has an active ban of this same type) — modeled as
// a real result value, not a thrown exception, matching every other
// expected-rejection shape in this codebase (AppointStaffRoleResult,
// SendGlobalChatMessageResult, ...). An UNEXPECTED error (a bad duration,
// a DB failure) still throws, same as before.
//
// STAFF / MODERATION PHASE 5 — `existingActionId` (the id of the
// already-active ban that blocked this attempt) rides along on the
// rejection so a caller (chat-ban.service.ts/site-ban.service.ts, and
// ultimately Global Chat's own moderation UI) can offer a concrete
// "revoke that existing ban and retry" recovery action — features/
// moderation/services/revoke-ban.service.ts's own revokeBan takes exactly
// this id — without a second lookup to rediscover which row is blocking.
export type RecordPunishmentError = "already-banned";
export type RecordPunishmentResult = RecordPunishmentSuccess | { ok: false; error: RecordPunishmentError; existingActionId: string };

// STAFF / MODERATION PHASE 3/5 — thrown ONLY inside a $transaction
// callback below to force a full ROLLBACK (including the counter
// increment that already ran earlier in the SAME transaction) the instant
// an active duplicate ban is found — never thrown outside a transaction,
// never exported. This is what makes "no incorrectly advanced counter
// from a failed duplicate attempt" true: Prisma reverts every write the
// transaction made, the counter included, the moment this is thrown: see
// each recordX function's own try/catch immediately around its
// `prisma.$transaction(...)` call, which converts this back into a plain
// `{ ok: false, error: "already-banned", existingActionId }` result for
// the caller.
class DuplicateActiveBanError extends Error {
  existingActionId: string;

  constructor(existingActionId: string) {
    super();
    this.existingActionId = existingActionId;
  }
}

// CONCURRENCY — the exact mechanism the brief requires: inside ONE
// prisma.$transaction, (1) atomically increment this target's own
// counter via a single upsert (the row lock Postgres takes for that
// statement is what serializes two staff members racing to punish the
// same target — see prisma/schema.prisma's PlayerModerationCounters doc
// comment, same precedent as lib/auth/login-lockout.ts's
// recordFailedLoginAttempt), (2) — PHASE 3 — check for an already-active
// ban of the SAME type using that now-acquired lock (isChatBanned, passed
// this same `tx` so it reads through the one open transaction instead of
// a second connection), throwing DuplicateActiveBanError to roll
// everything back (counter included) if one is found, (3) determine the
// duration from the freshly-incremented count, (4) create the
// ModerationAction row.
//
// Why the counter-upsert happens BEFORE the duplicate check rather than
// after: the upsert's own row lock is the ONLY serialization primitive
// available here (a plain SELECT for "is there an active ban" takes no
// lock in Postgres's default read-committed isolation, so two concurrent
// transactions could otherwise both read "no active ban" before either
// commits). Locking first and rolling back on rejection is exactly as
// correct as checking first — the rollback fully undoes the increment —
// and is the only order that actually serializes two concurrent calls
// against the SAME target: transaction B's own upsert simply blocks until
// transaction A commits or rolls back, so B can never observe a state A
// hasn't fully finished writing.
export async function recordProgressiveChatBan(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  reason?: string | null;
}): Promise<RecordPunishmentResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const counters = await tx.playerModerationCounters.upsert({
        where: { playerId: params.targetPlayerId },
        create: { playerId: params.targetPlayerId, chatBanCount: 1 },
        update: { chatBanCount: { increment: 1 } },
      });
      const existingChatBanId = await getActiveChatBanId(params.targetPlayerId, new Date(), tx);
      if (existingChatBanId) throw new DuplicateActiveBanError(existingChatBanId);

      const occurrence = counters.chatBanCount;
      const durationMinutes = getChatBanDurationMinutesForOccurrence(occurrence);
      const { action, expiresAt } = await createTimedPunishment(tx, {
        ...params,
        actionType: "chat_ban",
        durationMinutes,
      });
      return { ok: true, action, occurrence, durationMinutes, expiresAt };
    });
  } catch (error) {
    if (error instanceof DuplicateActiveBanError) return { ok: false, error: "already-banned", existingActionId: error.existingActionId };
    throw error;
  }
}

// OWNER's manual chat ban — NOT restricted by progression (spec), but
// still increments the SAME chatBanCount counter progressive bans read
// (see this module's own "PROGRESSION COUNTING SCOPE" doc comment above),
// and is subject to the exact same active-duplicate-ban guard as the
// progressive path above.
export async function recordManualChatBan(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  durationMinutes: number;
  reason?: string | null;
}): Promise<RecordPunishmentResult> {
  if (!isValidOwnerChatBanDurationMinutes(params.durationMinutes)) {
    throw new Error(`recordManualChatBan: ${params.durationMinutes} is not one of the allowed OWNER chat-ban durations`);
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const counters = await tx.playerModerationCounters.upsert({
        where: { playerId: params.targetPlayerId },
        create: { playerId: params.targetPlayerId, chatBanCount: 1 },
        update: { chatBanCount: { increment: 1 } },
      });
      const existingChatBanId = await getActiveChatBanId(params.targetPlayerId, new Date(), tx);
      if (existingChatBanId) throw new DuplicateActiveBanError(existingChatBanId);

      const { action, expiresAt } = await createTimedPunishment(tx, {
        ...params,
        actionType: "chat_ban",
        durationMinutes: params.durationMinutes,
      });
      return { ok: true, action, occurrence: counters.chatBanCount, durationMinutes: params.durationMinutes, expiresAt };
    });
  } catch (error) {
    if (error instanceof DuplicateActiveBanError) return { ok: false, error: "already-banned", existingActionId: error.existingActionId };
    throw error;
  }
}

// Mirrors recordProgressiveChatBan exactly, against the fully independent
// siteBanCount counter and the site_ban active-duplicate guard (spec:
// chat and site progression must never share or influence each other).
export async function recordProgressiveSiteBan(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  reason?: string | null;
}): Promise<RecordPunishmentResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      const counters = await tx.playerModerationCounters.upsert({
        where: { playerId: params.targetPlayerId },
        create: { playerId: params.targetPlayerId, siteBanCount: 1 },
        update: { siteBanCount: { increment: 1 } },
      });
      const existingSiteBanId = await getActiveSiteBanId(params.targetPlayerId, new Date(), tx);
      if (existingSiteBanId) throw new DuplicateActiveBanError(existingSiteBanId);

      const occurrence = counters.siteBanCount;
      const durationMinutes = getSiteBanDurationMinutesForOccurrence(occurrence);
      const { action, expiresAt } = await createTimedPunishment(tx, {
        ...params,
        actionType: "site_ban",
        durationMinutes,
      });
      return { ok: true, action, occurrence, durationMinutes, expiresAt };
    });
  } catch (error) {
    if (error instanceof DuplicateActiveBanError) return { ok: false, error: "already-banned", existingActionId: error.existingActionId };
    throw error;
  }
}

export async function recordManualSiteBan(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  durationMinutes: number;
  reason?: string | null;
}): Promise<RecordPunishmentResult> {
  if (!isValidOwnerSiteBanDurationMinutes(params.durationMinutes)) {
    throw new Error(`recordManualSiteBan: ${params.durationMinutes} is not one of the allowed OWNER site-ban durations`);
  }
  try {
    return await prisma.$transaction(async (tx) => {
      const counters = await tx.playerModerationCounters.upsert({
        where: { playerId: params.targetPlayerId },
        create: { playerId: params.targetPlayerId, siteBanCount: 1 },
        update: { siteBanCount: { increment: 1 } },
      });
      const existingSiteBanId = await getActiveSiteBanId(params.targetPlayerId, new Date(), tx);
      if (existingSiteBanId) throw new DuplicateActiveBanError(existingSiteBanId);

      const { action, expiresAt } = await createTimedPunishment(tx, {
        ...params,
        actionType: "site_ban",
        durationMinutes: params.durationMinutes,
      });
      return { ok: true, action, occurrence: counters.siteBanCount, durationMinutes: params.durationMinutes, expiresAt };
    });
  } catch (error) {
    if (error instanceof DuplicateActiveBanError) return { ok: false, error: "already-banned", existingActionId: error.existingActionId };
    throw error;
  }
}

export type RecordPermanentBanResult =
  | { ok: true; action: ModerationActionRecord }
  | { ok: false; error: RecordPunishmentError; existingActionId: string };

// PERMANENT SITE BAN — deliberately separate from the progression system
// (explicit spec rule): never touches PlayerModerationCounters's own
// chatBanCount/siteBanCount at all, so it can never affect (or be
// affected by) a temporary-ban occurrence count. No durationMinutes/
// expiresAt — remains active until an explicit revocation (see
// revokeModerationAction below) sets revokedAt.
//
// PHASE 3 — CONCURRENCY — reuses PlayerModerationCounters as a pure LOCK
// (via a no-op `update: {}` upsert — same "no-op update on an
// already-existing row" idiom lib/auth/player-profile.ts's
// ensurePlayerProfile already establishes for PlayerProfile itself), even
// though a permanent ban never increments either counter field: this is
// what makes two concurrent permanent-ban attempts against the same
// target serialize exactly like the temporary-ban paths above, reusing
// the one row this feature already has per-target rather than inventing a
// second lock primitive (or a schema change) just for this one case.
export async function recordPermanentSiteBan(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  reason?: string | null;
}): Promise<RecordPermanentBanResult> {
  try {
    return await prisma.$transaction(async (tx) => {
      await tx.playerModerationCounters.upsert({
        where: { playerId: params.targetPlayerId },
        create: { playerId: params.targetPlayerId },
        update: {},
      });
      const existingPermanentBanId = await getActivePermanentSiteBanId(params.targetPlayerId, tx);
      if (existingPermanentBanId) throw new DuplicateActiveBanError(existingPermanentBanId);

      const action = await tx.moderationAction.create({
        data: {
          targetPlayerId: params.targetPlayerId,
          actorPlayerId: params.actorPlayerId,
          actionType: "permanent_site_ban",
          reason: params.reason ?? null,
        },
      });
      return { ok: true, action: action as ModerationActionRecord };
    });
  } catch (error) {
    if (error instanceof DuplicateActiveBanError) return { ok: false, error: "already-banned", existingActionId: error.existingActionId };
    throw error;
  }
}

// GLOBAL-CHAT MESSAGE DELETION — no duration, no progression counter, no
// duplicate guard (a player can have any number of deleted messages).
// targetResourceId is the deleted GlobalChatMessage's own id — a bare
// reference (see prisma/schema.prisma's own doc comment on why it's never
// an enforced FK).
export async function recordMessageDeletion(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  targetResourceId: string;
  reason?: string | null;
}): Promise<ModerationActionRecord> {
  const action = await prisma.moderationAction.create({
    data: {
      targetPlayerId: params.targetPlayerId,
      actorPlayerId: params.actorPlayerId,
      actionType: "message_delete",
      reason: params.reason ?? null,
      targetResourceId: params.targetResourceId,
    },
  });
  return action as ModerationActionRecord;
}

// STAFF / MODERATION — PHASE 6 — STAFF ACTION AUDIT. The one place a
// staff appointment/removal is ever recorded — same generalized
// ModerationAction table every other action in this feature already uses
// (explicit spec: "Do not create a second audit system"), never a
// duration/expiry (a role change has neither) and no targetResourceId
// (nothing being referenced beyond the target player themselves). `role`
// — the role granted (role_grant) or the role the target held just
// before removal (role_revoke) — is the one thing worth recording beyond
// the standard actor/target/timestamp fields, so it rides in `metadata`
// (`{ role }`) rather than a new dedicated column, matching
// ModerationAction's own "optional structured data, populated only when
// a type actually needs it" precedent (see that model's own doc comment
// in prisma/schema.prisma).
export async function recordStaffRoleChange(params: {
  targetPlayerId: string;
  actorPlayerId: string;
  actionType: "role_grant" | "role_revoke";
  role: StaffRole;
}): Promise<ModerationActionRecord> {
  const action = await prisma.moderationAction.create({
    data: {
      targetPlayerId: params.targetPlayerId,
      actorPlayerId: params.actorPlayerId,
      actionType: params.actionType,
      metadata: { role: params.role },
    },
  });
  return action as ModerationActionRecord;
}

export type RevokeModerationActionError = "already-revoked";
export type RevokeModerationActionResult = { ok: true; action: ModerationActionRecord } | { ok: false; error: RevokeModerationActionError };

// REVOCATION — sets revokedAt/revokedByPlayerId/revocationReason on the
// ORIGINAL punishment row. Deliberately never touches
// PlayerModerationCounters: this is the one function that makes "revoking
// a ban must never decrement progression" true by construction — a
// revoked 1st ban's next progressive ban is still computed as the 2nd,
// because the counter this reads from was only ever bumped once, at
// creation, by recordProgressiveChatBan/recordManualChatBan above.
//
// PHASE 3 — the write itself is a GUARDED conditional `updateMany`
// (`WHERE id = actionId AND revokedAt IS NULL`) — the same CAS idiom this
// codebase already uses for every other exactly-once claim
// (AccountDeletionRequest.consumedAt, LeagueTournament.rewardsGrantedAt,
// this feature's own StaffRosterCounter guard) — rather than a plain
// `update`, so two callers racing to revoke the SAME action can never
// both "win": only the one whose write actually flips revokedAt from null
// gets `{ ok: true }` back; the other correctly observes
// `{ ok: false, error: "already-revoked" }` instead of silently
// overwriting who/why it was revoked.
export async function revokeModerationAction(params: {
  actionId: string;
  revokedByPlayerId: string;
  revocationReason?: string | null;
}): Promise<RevokeModerationActionResult> {
  const updated = await prisma.moderationAction.updateMany({
    where: { id: params.actionId, revokedAt: null },
    data: {
      revokedAt: new Date(),
      revokedByPlayerId: params.revokedByPlayerId,
      revocationReason: params.revocationReason ?? null,
    },
  });
  if (updated.count === 0) return { ok: false, error: "already-revoked" };

  const action = await prisma.moderationAction.findUnique({ where: { id: params.actionId } });
  return { ok: true, action: action as ModerationActionRecord };
}

// Shared by every *timed* punishment creator above (progressive/manual
// chat and site bans) — never by the untimed ones (permanent ban, message
// deletion), which create their own row directly since they have no
// duration/expiresAt to compute.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function createTimedPunishment(
  tx: any,
  params: {
    targetPlayerId: string;
    actorPlayerId: string;
    actionType: ModerationActionType;
    durationMinutes: number;
    reason?: string | null;
  }
): Promise<{ action: ModerationActionRecord; expiresAt: Date }> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + params.durationMinutes * 60_000);
  const action = await tx.moderationAction.create({
    data: {
      targetPlayerId: params.targetPlayerId,
      actorPlayerId: params.actorPlayerId,
      actionType: params.actionType,
      reason: params.reason ?? null,
      durationMinutes: params.durationMinutes,
      expiresAt,
    },
  });
  return { action: action as ModerationActionRecord, expiresAt };
}

// Read-only helpers for a future audit-history UI — never called by
// anything else in this phase.
export async function getModerationCounters(playerId: string): Promise<{ chatBanCount: number; siteBanCount: number }> {
  const row = await prisma.playerModerationCounters.findUnique({ where: { playerId } });
  return { chatBanCount: row?.chatBanCount ?? 0, siteBanCount: row?.siteBanCount ?? 0 };
}

export async function getModerationHistoryForPlayer(playerId: string): Promise<ModerationActionRecord[]> {
  const rows = await prisma.moderationAction.findMany({
    where: { targetPlayerId: playerId },
    orderBy: { createdAt: "desc" },
  });
  return rows as ModerationActionRecord[];
}
