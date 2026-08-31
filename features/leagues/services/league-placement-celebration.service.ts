import "server-only";

import { createNotification } from "@/features/notifications/services/notification-service";
import { prisma } from "@/lib/db/prisma";
import { getLeagueDisplayNameHe } from "../data/league-cycle-labels";
import { getLeaguePlacementRewardDefinition, type LeaguePlacementRewardDefinition } from "../data/league-reward-registry";
import { leagueAwardImageUrl } from "../data/league-achievement-media";
import type { LeagueId } from "../types/league.types";

// LEAGUE — FINAL PLACEMENT CELEBRATION MODAL. Persisted acknowledgement
// reuses the EXISTING generic Notification model (prisma/schema.prisma) —
// no new table, no migration. A new NotificationType literal,
// "LEAGUE_PLACEMENT_ACHIEVED" (features/notifications/types.ts), is added
// exactly the way that type's own doc comment already documents growing
// the union ("never with a migration"). The acknowledgement record is
// created at the moment the player clicks "אישור", via the shared
// createNotification helper (same isRead: false default every other
// notification gets — irrelevant here, since ACKNOWLEDGEMENT is defined by
// this row's mere EXISTENCE, never by its isRead state — nothing in this
// file ever reads/relies on isRead). A pending celebration is simply
// defined as "a real LeagueTournamentPlacement row with no matching
// LEAGUE_PLACEMENT_ACHIEVED notification yet" (see
// getPendingLeaguePlacementCelebrations below), so the read path never
// writes and the write path only ever happens on an explicit player click
// — same "notification is a durable, deliberate record" precedent every
// other NotificationType in this project already follows (see
// PRIVATE_MESSAGE_RECEIVED's own dedup check in
// features/friends/services/private-chat.service.ts, whose exact
// "findMany by flat fields, then filter metadata in application code"
// pattern this file reuses — the fake-DB test harness has no support for
// Prisma's JSON `{ path, equals }` query operator, so metadata is never
// filtered at the query level here either).
//
// LeagueTournamentPlacement (Phase 7) remains the ONE authoritative record
// of "who placed where" — this file only ever READS it, never writes to
// it, and never touches league-reward.service.ts's exactly-once reward
// grant. The reward SUMMARY shown in the modal is the static
// LeaguePlacementRewardDefinition (league-reward-registry.ts) — the exact
// same definition grantPlacementReward itself reads to decide what to
// grant — never a second/duplicated reward table, and never a live
// re-grant.

const PLACEMENT_TITLE_HE: Record<1 | 2 | 3, string> = {
  1: "מקום ראשון!",
  2: "מקום שני!",
  3: "מקום שלישי!",
};

// The same medal-emoji + "מקום ראשון/שני/שלישי" wording LeaguesContent.tsx's
// own reward preview already establishes — reused for the persisted
// notification's own message text, never new/invented wording.
const PLACEMENT_MEDAL_LABEL_HE: Record<1 | 2 | 3, string> = {
  1: "🥇 מקום ראשון",
  2: "🥈 מקום שני",
  3: "🥉 מקום שלישי",
};

export interface PendingLeaguePlacementCelebration {
  readonly tournamentId: string;
  readonly leagueId: LeagueId;
  readonly place: 1 | 2 | 3;
  readonly leagueDisplayName: string;
  readonly placementTitle: string;
  readonly imageUrl: string;
  readonly reward: LeaguePlacementRewardDefinition;
}

function readTournamentId(metadata: unknown): string | null {
  if (metadata === null || typeof metadata !== "object") return null;
  const value = (metadata as { tournamentId?: unknown }).tournamentId;
  return typeof value === "string" ? value : null;
}

// Every LEAGUE_PLACEMENT_ACHIEVED notification this player has ever had
// created for them — the mere EXISTENCE of one for a given tournamentId
// means that placement has already been acknowledged (there is no
// unacknowledged/unread variant of this notification type — see this
// file's own header doc comment).
async function getAcknowledgedTournamentIds(playerId: string): Promise<Set<string>> {
  const rows = await prisma.notification.findMany({
    where: { playerId, type: "LEAGUE_PLACEMENT_ACHIEVED" },
    select: { metadata: true },
  });

  const ids = new Set<string>();
  for (const row of rows) {
    const tournamentId = readTournamentId(row.metadata);
    if (tournamentId) ids.add(tournamentId);
  }
  return ids;
}

// PENDING CELEBRATIONS — every one of this player's own top-3 placements
// (LeagueTournamentPlacement — a participation-only player has zero rows
// here, so they structurally never get a celebration modal, no separate
// check needed) that has no acknowledgement notification yet. Ordered
// deterministically — oldest EARNED tournament first (weekKey ascending),
// tie-broken by place ascending — never by achievement-row insertion order,
// so "show one at a time" always presents them in the same stable sequence
// across repeated visits.
export async function getPendingLeaguePlacementCelebrations(playerId: string): Promise<PendingLeaguePlacementCelebration[]> {
  const [placements, acknowledgedTournamentIds] = await Promise.all([
    prisma.leagueTournamentPlacement.findMany({ where: { playerId } }),
    getAcknowledgedTournamentIds(playerId),
  ]);

  const pending = placements.filter((placement) => !acknowledgedTournamentIds.has(placement.tournamentId));
  if (pending.length === 0) return [];

  const tournamentIds = [...new Set(pending.map((placement) => placement.tournamentId))];
  const tournaments = await Promise.all(tournamentIds.map((id) => prisma.leagueTournament.findUnique({ where: { id } })));
  const tournamentById = new Map(tournaments.flatMap((tournament) => (tournament ? [[tournament.id, tournament] as const] : [])));

  const results = pending.flatMap((placement): (PendingLeaguePlacementCelebration & { weekKey: string })[] => {
    const tournament = tournamentById.get(placement.tournamentId);
    if (!tournament) return [];
    const leagueId = tournament.leagueId as LeagueId;
    const place = placement.place as 1 | 2 | 3;

    return [
      {
        tournamentId: placement.tournamentId,
        leagueId,
        place,
        leagueDisplayName: getLeagueDisplayNameHe(leagueId),
        placementTitle: PLACEMENT_TITLE_HE[place],
        imageUrl: leagueAwardImageUrl(leagueId, place),
        reward: getLeaguePlacementRewardDefinition(leagueId, place),
        weekKey: tournament.weekKey,
      },
    ];
  });

  return results
    .sort((a, b) => (a.weekKey !== b.weekKey ? a.weekKey.localeCompare(b.weekKey) : a.place - b.place))
    .map(({ weekKey: _weekKey, ...celebration }) => celebration);
}

export type AcknowledgeLeaguePlacementResult = "acknowledged" | "already-acknowledged" | "not-found";

// ACKNOWLEDGE — the ONE write this feature ever performs. OWNERSHIP
// (section 9 of this task) is enforced by requiring a REAL
// LeagueTournamentPlacement row for (tournamentId, playerId) to exist — a
// client-supplied tournamentId that isn't this exact player's own
// placement (wrong player, or a tournamentId that doesn't exist at all)
// resolves "not-found", never creates anything. DUPLICATE SUBMISSIONS
// (section 3) resolve "already-acknowledged" instead of creating a second
// notification. This never calls grantCompletedLeagueTournamentRewards or
// any currency/XP/chest grant — acknowledging only ever records that the
// modal was seen, exactly like markNotificationRead does for every other
// notification type.
export async function acknowledgeLeaguePlacementCelebration(playerId: string, tournamentId: string): Promise<AcknowledgeLeaguePlacementResult> {
  // findMany (never findFirst) — same convention every other query in this
  // file already uses; tournamentId+place is unique per tournament, so at
  // most one row can ever match for a given (tournamentId, playerId) pair.
  const placement = (await prisma.leagueTournamentPlacement.findMany({ where: { tournamentId, playerId } }))[0];
  if (!placement) return "not-found";

  const acknowledgedTournamentIds = await getAcknowledgedTournamentIds(playerId);
  if (acknowledgedTournamentIds.has(tournamentId)) return "already-acknowledged";

  const tournament = await prisma.leagueTournament.findUnique({ where: { id: tournamentId } });
  if (!tournament) return "not-found";

  const leagueId = tournament.leagueId as LeagueId;
  const place = placement.place as 1 | 2 | 3;

  await createNotification(
    prisma,
    playerId,
    "LEAGUE_PLACEMENT_ACHIEVED",
    `${PLACEMENT_MEDAL_LABEL_HE[place]} — ${getLeagueDisplayNameHe(leagueId)}`,
    { tournamentId, leagueId, place }
  );

  return "acknowledged";
}
