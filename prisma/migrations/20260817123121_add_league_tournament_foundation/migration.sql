-- CreateTable
CREATE TABLE "league_tournament" (
    "id" TEXT NOT NULL,
    "leagueId" TEXT NOT NULL,
    "weekKey" TEXT NOT NULL,
    "registrationClosesAt" TIMESTAMP(3) NOT NULL,
    "round1StartsAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'registration-open',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "league_tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_tournament_participant" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "playerId" TEXT,
    "participantType" TEXT NOT NULL,
    "registeredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "league_tournament_participant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "league_tournament_match" (
    "id" TEXT NOT NULL,
    "tournamentId" TEXT NOT NULL,
    "roundNumber" INTEGER NOT NULL,
    "slot" INTEGER NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "participantAId" TEXT NOT NULL,
    "participantBId" TEXT NOT NULL,
    "winnerParticipantId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'scheduled',
    "involvesComputer" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "league_tournament_match_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "league_tournament_leagueId_weekKey_key" ON "league_tournament"("leagueId", "weekKey");

-- CreateIndex
CREATE INDEX "league_tournament_participant_tournamentId_idx" ON "league_tournament_participant"("tournamentId");

-- CreateIndex
CREATE UNIQUE INDEX "league_tournament_participant_tournamentId_playerId_key" ON "league_tournament_participant"("tournamentId", "playerId");

-- CreateIndex
CREATE INDEX "league_tournament_match_tournamentId_roundNumber_idx" ON "league_tournament_match"("tournamentId", "roundNumber");

-- CreateIndex
CREATE UNIQUE INDEX "league_tournament_match_tournamentId_roundNumber_slot_key" ON "league_tournament_match"("tournamentId", "roundNumber", "slot");

-- AddForeignKey
ALTER TABLE "league_tournament_participant" ADD CONSTRAINT "league_tournament_participant_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "league_tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_tournament_participant" ADD CONSTRAINT "league_tournament_participant_playerId_fkey" FOREIGN KEY ("playerId") REFERENCES "player_profile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_tournament_match" ADD CONSTRAINT "league_tournament_match_tournamentId_fkey" FOREIGN KEY ("tournamentId") REFERENCES "league_tournament"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_tournament_match" ADD CONSTRAINT "league_tournament_match_participantAId_fkey" FOREIGN KEY ("participantAId") REFERENCES "league_tournament_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_tournament_match" ADD CONSTRAINT "league_tournament_match_participantBId_fkey" FOREIGN KEY ("participantBId") REFERENCES "league_tournament_participant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "league_tournament_match" ADD CONSTRAINT "league_tournament_match_winnerParticipantId_fkey" FOREIGN KEY ("winnerParticipantId") REFERENCES "league_tournament_participant"("id") ON DELETE SET NULL ON UPDATE CASCADE;
