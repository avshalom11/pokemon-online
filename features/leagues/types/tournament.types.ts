// GYMS & LEAGUES PHASE 5 — the app-layer validated string unions behind
// LeagueTournament.status / LeagueTournamentMatch.status /
// LeagueTournamentParticipant.participantType (all plain string columns in
// Prisma, no enum — same "no Prisma enum synced to a TS union" convention
// FieldBattleSession.zoneId/NpcBattleSession.battleSource already
// established for this project).

export type LeagueTournamentStatus = "registration-open" | "registration-closed" | "generated" | "in-progress" | "completed";

export type LeagueTournamentMatchStatus = "scheduled" | "in-progress" | "completed";

export type LeagueTournamentParticipantType = "player" | "computer";
